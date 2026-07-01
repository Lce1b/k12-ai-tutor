"""
RAG Engine — vector search over K12 AI curriculum knowledge base.
"""

import os
import json
from typing import List

from chromadb import PersistentClient
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from config import CHROMA_PATH, EMBED_MODEL


class RAGEngine:
    def __init__(self):
        self.embed_model = SentenceTransformer(EMBED_MODEL)
        os.makedirs(CHROMA_PATH, exist_ok=True)
        self.chroma = PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        self._init_collection()

    def _init_collection(self):
        name = "k12_ai_knowledge"
        try:
            self.collection = self.chroma.get_collection(name)
        except Exception:
            self.collection = self.chroma.create_collection(
                name,
                metadata={"hnsw:space": "cosine"},
            )
            self._load_knowledge()

    def _load_knowledge(self):
        """Load knowledge base from JSON files."""
        kb_dir = os.path.join(os.path.dirname(__file__), "..", "knowledge")
        if not os.path.exists(kb_dir):
            return

        docs = []
        metas = []
        ids = []
        idx = 0

        for fname in sorted(os.listdir(kb_dir)):
            if not fname.endswith(".json") or fname == "curriculum.json":
                continue
            path = os.path.join(kb_dir, fname)
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, list):
                continue

            for item in data:
                content = item.get("content", "")
                grade = item.get("grade", "middle")
                topic = item.get("topic", "general")
                title = item.get("title", "")

                docs.append(content)
                metas.append({"grade": grade, "topic": topic, "title": title})
                ids.append(f"doc_{idx}")
                idx += 1

        if docs:
            embeddings = self.embed_model.encode(docs).tolist()
            self.collection.add(embeddings=embeddings, documents=docs, metadatas=metas, ids=ids)

    def search(self, query: str, grade: str = None, top_k: int = 5) -> List[dict]:
        """Search knowledge base, optionally filtered by grade level."""
        query_emb = self.embed_model.encode([query]).tolist()

        where_filter = None
        if grade:
            where_filter = {"grade": grade}

        results = self.collection.query(
            query_embeddings=query_emb,
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        out = []
        for i in range(len(results["ids"][0])):
            out.append({
                "content": results["documents"][0][i],
                "meta": results["metadatas"][0][i],
                "score": 1 - results["distances"][0][i],
            })
        return out


rag = RAGEngine()
