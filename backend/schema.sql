-- K12 AI Tutor Database Schema

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    grade VARCHAR(20) NOT NULL DEFAULT 'middle',
    title VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(50) DEFAULT '',
    topic VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_state (
    session_id VARCHAR(64) PRIMARY KEY,
    xp INT DEFAULT 0,
    `level` INT DEFAULT 1,
    streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    total_quizzes INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    mastered_topics JSON DEFAULT ('[]'),
    weak_topics JSON DEFAULT ('[]'),
    topic_frequency JSON DEFAULT ('{}'),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_quiz_session ON quiz_results(session_id, created_at);
CREATE INDEX idx_quiz_topic ON quiz_results(topic);
