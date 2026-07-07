"""
Database module — async MySQL connection pool via aiomysql.
"""

import os
import aiomysql

_pool = None


async def init_db():
    global _pool
    _pool = await aiomysql.create_pool(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        db=os.getenv("MYSQL_DB", "k12_tutor"),
        autocommit=True,
        minsize=2,
        maxsize=10,
        charset="utf8mb4",
    )


async def get_conn():
    return await _pool.acquire()


async def release_conn(conn):
    await _pool.release(conn)


async def execute(sql: str, args=None):
    conn = await _pool.acquire()
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, args)
            return cur
    finally:
        await _pool.release(conn)


async def fetchone(sql: str, args=None) -> dict | None:
    conn = await _pool.acquire()
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, args)
            return await cur.fetchone()
    finally:
        await _pool.release(conn)


async def fetchall(sql: str, args=None) -> list[dict]:
    conn = await _pool.acquire()
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, args)
            return await cur.fetchall()
    finally:
        await _pool.release(conn)


async def close_db():
    if _pool:
        _pool.close()
        await _pool.wait_closed()


async def init_schema():
    """Run CREATE TABLE IF NOT EXISTS on startup.  Index errors (duplicate) are
    harmless — they just mean the index already exists from a prior run."""
    import logging
    _log = logging.getLogger(__name__)

    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    for stmt in schema_sql.split(";"):
        stmt = stmt.strip()
        if stmt and not stmt.startswith("--"):
            try:
                await execute(stmt)
            except Exception as e:
                # Duplicate index / table is fine — already created
                if "Duplicate" in str(e) or "already exists" in str(e):
                    _log.debug("Schema statement skipped (already exists): %s", str(e)[:80])
                else:
                    raise
