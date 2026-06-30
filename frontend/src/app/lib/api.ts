const API_BASE = "/api";

export interface ChatRequest {
  session_id: string;
  message: string;
  grade: string;
}

export interface NextStep {
  message: string;
  suggestions: { text: string; action: string; topic: string }[];
}

export interface ChatResponse {
  intent: string;
  grade: string;
  topic: string;
  type: "chat" | "lesson" | "quiz" | "code" | "animation" | "picture_book";
  message: string;
  rag_sources?: { title: string; score: number }[];
  next_step?: NextStep;
  lesson?: {
    title: string;
    intro: string;
    sections: { heading: string; content: string; example: string }[];
    knowledge_cards: { term: string; definition: string; icon: string }[];
    interaction: string;
    summary: string;
  };
  quiz?: {
    questions: {
      type: string;
      question: string;
      options: string[];
      answer: string;
      explanation: string;
    }[];
  };
  code?: {
    title: string;
    explanation: string;
    code: string;
    expected_output: string;
    challenge: string;
  };
  animation_html?: string;
  story?: {
    title: string;
    pages: { text: string; image_prompt: string }[];
    moral: string;
  };
}

export interface GreetingResponse {
  greeting: string;
  suggestions: { text: string; action: string; topic: string }[];
  grade: string;
  stats: {
    total_messages: number;
    total_quizzes: number;
    accuracy: number;
    topics_studied: number;
    mastered_topics: string[];
    weak_topics: string[];
    recent_topics: string[];
    level: number;
    xp: number;
    xp_for_next: number;
    streak: number;
    max_streak: number;
    top_interests: string[];
  };
}

export interface QuizEvalResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  feedback: string;
  xp?: { xp: number; level: number; leveled_up: boolean; xp_for_next: number };
  streak?: { streak: number; max_streak: number };
}

export interface QuizEvalRequest {
  question: Record<string, unknown>;
  answer: string;
  session_id: string;
  topic: string;
}

export interface QuizEvalResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  feedback: string;
}

export interface CodeExecRequest {
  code: string;
}

export interface CodeExecResponse {
  success: boolean;
  stdout: string;
  stderr: string;
}

export async function fetchGreeting(sessionId: string, grade: string): Promise<GreetingResponse> {
  const params = new URLSearchParams({ session_id: sessionId, grade });
  const res = await fetch(`${API_BASE}/greeting?${params}`);
  if (!res.ok) throw new Error(`Greeting API error (${res.status})`);
  return res.json();
}

export async function sendMessage(params: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chat API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function evaluateQuiz(params: QuizEvalRequest): Promise<QuizEvalResponse> {
  const res = await fetch(`${API_BASE}/quiz/eval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Quiz eval API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function executeCode(params: CodeExecRequest): Promise<CodeExecResponse> {
  const res = await fetch(`${API_BASE}/code/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Code exec API error (${res.status}): ${text}`);
  }
  return res.json();
}

export function getPptDownloadUrl(topic: string, grade: string): string {
  return `${API_BASE}/resources/ppt`;
}

export function getWordDownloadUrl(topic: string, grade: string): string {
  return `${API_BASE}/resources/word`;
}

export interface PptParseResult {
  filename?: string;
  total_slides?: number;
  indexed_count?: number;
  error?: string;
  course_meta?: {
    title: string;
    subject: string;
    estimated_grade: string;
    estimated_duration: string;
    difficulty: string;
    prerequisites: string[];
  };
  slide_analysis?: {
    slide_num: number;
    type: string;
    heading: string;
    key_message: string;
    knowledge_points: string[];
    importance: string;
  }[];
  knowledge_graph?: { source: string; relation: string; target: string }[];
  key_concepts?: {
    term: string;
    definition: string;
    grade_level: string;
    examples: string[];
  }[];
  generated_quiz?: {
    type: string;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
    related_knowledge: string;
  }[];
  teaching_suggestions?: {
    animation_topics: string[];
    coding_examples: string[];
    discussion_questions: string[];
    recommended_next: string;
  };
  knowledge_entries?: {
    grade: string;
    topic: string;
    title: string;
    content: string;
  }[];
  slides_raw?: { slide_num: number; title: string; text_len?: number; has_ocr?: boolean; has_multimodal?: boolean }[];
  ocr_stats?: { total_images: number; ocr_success: number; ocr_chars: number };
  image_stats?: {
    total_images: number;
    ocr_handled: number;
    ocr_chars: number;
    multimodal_handled: number;
    multimodal_total: number;
    multimodal_chars: number;
  };
}

export async function deepParsePpt(formData: FormData): Promise<PptParseResult> {
  const res = await fetch(`${API_BASE}/resources/ppt/deep-parse`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PPT parse API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function downloadResource(type: "ppt" | "word", topic: string, grade: string, sessionId: string) {
  const res = await fetch(`${API_BASE}/resources/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, grade, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${topic}_教学${type === "ppt" ? "课件" : "文档"}.${type === "ppt" ? "pptx" : "docx"}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
