import json
import os
import urllib.request
from typing import Optional
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import gradio as gr
import uvicorn

# 1. Initialize FastAPI App
app = FastAPI(
    title="ROOM 7.5 Cinema Vector Engine",
    description="High-Dimensional Latent Vector Recommender Engine with Cosine Geodesics and TMDB Poster Resolution",
    version="1.0.0"
)

# 2. CORS configuration for production deployment (allows Vercel frontends & localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Locate & Load Dataset
base_dir = os.path.dirname(__file__)
DATA_CANDIDATES = [
    "data/tmdb_5000_movies.csv",
    "tmdb_5000_movies.csv",
    os.path.join(base_dir, "data", "tmdb_5000_movies.csv"),
    os.path.join(base_dir, "tmdb_5000_movies.csv"),
]

data_path = None
for candidate in DATA_CANDIDATES:
    if os.path.exists(candidate):
        data_path = candidate
        break

if not data_path:
    raise FileNotFoundError("Could not locate tmdb_5000_movies.csv in any candidate path.")

print(f"⏳ [Startup] Loading 4,800+ TMDB movies from '{data_path}'...")
df = pd.read_csv(data_path)

def parse_json_column(column_data):
    try:
        items = json.loads(column_data)
        return " ".join([i['name'].replace(" ", "") for i in items])
    except Exception:
        return ""

df['overview'] = df['overview'].fillna('')
df['genre_text'] = df['genres'].apply(parse_json_column)
df['keyword_text'] = df['keywords'].apply(parse_json_column)
df['soup'] = df['overview'] + " " + df['genre_text'] + " " + df['keyword_text']

print("📐 [Startup] Computing 10,000-dimensional TF-IDF Matrix...")
tfidf = TfidfVectorizer(max_features=10000, stop_words='english')
tfidf_matrix = tfidf.fit_transform(df['soup'])
print("🚀 [Startup] Vector Matrix Ready!")

# 4. TMDB Poster Caching Layer
TMDB_API_KEY = "a9f5613530bc07f20a0af74ba259bb50"
data_dir = os.path.join(base_dir, "data")
CACHE_PATH = os.path.join(data_dir, "poster_cache.json") if os.path.isdir(data_dir) else os.path.join(base_dir, "poster_cache.json")

poster_cache = {}
if os.path.exists(CACHE_PATH):
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            poster_cache = json.load(f)
    except Exception:
        poster_cache = {}

def get_poster_url(movie_id: int):
    str_id = str(movie_id)
    if str_id in poster_cache and poster_cache[str_id]:
        return poster_cache[str_id]

    try:
        url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            poster_path = data.get("poster_path")
            if poster_path:
                full_url = f"https://image.tmdb.org/t/p/w500{poster_path}"
                poster_cache[str_id] = full_url
                try:
                    with open(CACHE_PATH, "w", encoding="utf-8") as f:
                        json.dump(poster_cache, f)
                except Exception:
                    pass
                return full_url
    except Exception:
        pass

    poster_cache[str_id] = None
    return None

# 5. Request Schemas (Pydantic)
class RecommendRequest(BaseModel):
    title: str
    top_n: int = 6

class SearchRequest(BaseModel):
    query: Optional[str] = None
    description: Optional[str] = None
    top_n: int = 6

# 6. Helper to format movie card output
def format_movie(idx, match_score=None):
    row = df.iloc[idx]
    movie_id = int(row['id'])
    return {
        "id": movie_id,
        "title": str(row['title']),
        "poster_url": get_poster_url(movie_id),
        "overview": str(row['overview']),
        "rating": float(row['vote_average']),
        "vote_count": int(row['vote_count']),
        "genres": str(row['genre_text']).split()[:3],
        "match_percentage": round(float(match_score * 100), 1) if match_score is not None else None
    }

# --- FASTAPI REST API ROUTES ---

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "total_movies": len(df),
        "vector_dimensions": 10000,
        "engine": "TF-IDF + Cosine Geodesics"
    }

@app.get("/api/popular")
def get_popular_movies(limit: int = 6):
    """Returns top popular movies for the landing screen"""
    top_movies = df.sort_values(by="popularity", ascending=False).head(limit)
    return [format_movie(idx) for idx in top_movies.index]

@app.post("/api/recommend")
def recommend_by_title(req: RecommendRequest):
    """Recommends movies similar to a specific movie title"""
    matches = df[df['title'].str.lower() == req.title.lower()]
    if matches.empty:
        partial = df[df['title'].str.contains(req.title, case=False, na=False)]
        if partial.empty:
            raise HTTPException(status_code=404, detail=f"Movie '{req.title}' not found.")
        matches = partial.head(1)

    idx = matches.index[0]
    target_vector = tfidf_matrix[idx]
    scores = cosine_similarity(target_vector, tfidf_matrix).flatten()
    top_indices = scores.argsort()[::-1][1:req.top_n + 1]

    return {
        "query_movie": str(df.iloc[idx]['title']),
        "recommendations": [format_movie(i, scores[i]) for i in top_indices]
    }

@app.post("/api/search")
@app.post("/api/recommend/vibe")
def search_by_vibe(req: SearchRequest):
    """Semantic vector search based on plot description or vibe"""
    target = (req.query or req.description or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    query_vector = tfidf.transform([target])
    scores = cosine_similarity(query_vector, tfidf_matrix).flatten()
    top_indices = scores.argsort()[::-1][:req.top_n]

    return {
        "search_query": target,
        "results": [format_movie(i, scores[i]) for i in top_indices]
    }

# --- GRADIO EMBEDDED DEMO UI ---
def gradio_search(query_text, mode):
    if not query_text or not query_text.strip():
        return "Please enter a valid movie title or descriptive mood/vibe query."
    try:
        if mode == "Exact Title":
            res = recommend_by_title(RecommendRequest(title=query_text, top_n=5))
            films = res["recommendations"]
            header = f"### 🎬 Projections for: {res['query_movie']}\n\n"
        else:
            res = search_by_vibe(SearchRequest(query=query_text, top_n=5))
            films = res["results"]
            header = f"### 🌌 Subconscious Topology for: \"{query_text}\"\n\n"
        
        md = header
        for f in films:
            score = f.get('match_percentage')
            score_str = f"**{score}% Resonance**" if score else ""
            genres = " • ".join(f.get('genres', []))
            md += f"#### {f['title']} ({f['rating']} ★) {score_str}\n"
            md += f"*{genres}*\n\n{f['overview']}\n\n---\n"
        return md
    except Exception as e:
        return f"Error: {str(e)}"

with gr.Blocks(title="ROOM 7.5 API", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🎬 ROOM 7.5 — High-Dimensional Latent Vector Cinema Engine")
    gr.Markdown("FastAPI Machine Learning vector service powering the Vercel frontend. Test queries directly below or visit `/docs` for the interactive OpenAPI Swagger documentation.")
    with gr.Row():
        query_input = gr.Textbox(label="Query / Vibe / Title", placeholder="e.g. blade runner 2049 lonely replicant searching for soul in neon rain", lines=2)
        mode_choice = gr.Radio(["Subconscious Vibe", "Exact Title"], label="Mode", value="Subconscious Vibe")
    search_btn = gr.Button("Ignite Vector Search", variant="primary")
    output_display = gr.Markdown(label="Recommended Projections")
    search_btn.click(fn=gradio_search, inputs=[query_input, mode_choice], outputs=output_display)

# Mount Gradio into FastAPI at /
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
