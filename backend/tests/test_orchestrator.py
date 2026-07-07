"""
Tests for orchestrator.py — intent classification, topic extraction,
system prompt builder, grade profiles (non-LLM portions).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.orchestrator import (
    Intent,
    GradeLevel,
    GRADE_PROFILES,
    _keyword_intent,
    extract_topic,
    build_system_prompt,
)


class TestIntentEnum:
    def test_all_intents_defined(self):
        """All six intent types are defined."""
        expected = {"chat", "teach", "animate", "picture_book", "code", "quiz"}
        actual = {i.value for i in Intent}
        assert actual == expected

    def test_intent_from_string(self):
        """Intents can be constructed from their string values."""
        assert Intent("chat") == Intent.CHAT
        assert Intent("teach") == Intent.TEACH
        assert Intent("animate") == Intent.ANIMATE
        assert Intent("code") == Intent.CODE
        assert Intent("quiz") == Intent.QUIZ
        assert Intent("picture_book") == Intent.PICTURE_BOOK


class TestGradeLevelEnum:
    def test_all_grades_defined(self):
        """All four grade levels are defined."""
        expected = {"primary_low", "primary_high", "middle", "high"}
        actual = {g.value for g in GradeLevel}
        assert actual == expected

    def test_grade_from_string(self):
        """GradeLevels can be constructed from their string values."""
        assert GradeLevel("primary_low") == GradeLevel.P1
        assert GradeLevel("primary_high") == GradeLevel.P2
        assert GradeLevel("middle") == GradeLevel.M
        assert GradeLevel("high") == GradeLevel.H


class TestGradeProfiles:
    def test_all_grades_have_profiles(self):
        """Every grade level has a complete profile."""
        for grade in GradeLevel:
            profile = GRADE_PROFILES[grade]
            assert "name" in profile
            assert "age_range" in profile
            assert "tone" in profile
            assert "max_tokens" in profile
            assert "style" in profile

    def test_p1_profile(self):
        """小学低年级 profile targets 6-9 year olds."""
        p = GRADE_PROFILES[GradeLevel.P1]
        assert p["name"] == "小学低年级"
        assert p["age_range"] == "6-9岁"
        assert p["max_tokens"] == 800

    def test_p2_profile(self):
        """小学高年级 profile targets 9-12 year olds."""
        p = GRADE_PROFILES[GradeLevel.P2]
        assert p["name"] == "小学高年级"
        assert p["age_range"] == "9-12岁"
        assert p["max_tokens"] == 1200

    def test_middle_profile(self):
        """初中 profile targets 12-15 year olds."""
        p = GRADE_PROFILES[GradeLevel.M]
        assert p["name"] == "初中"
        assert p["age_range"] == "12-15岁"
        assert p["max_tokens"] == 1600

    def test_high_profile(self):
        """高中 profile targets 15-18 year olds."""
        p = GRADE_PROFILES[GradeLevel.H]
        assert p["name"] == "高中"
        assert p["age_range"] == "15-18岁"
        assert p["max_tokens"] == 2000


class TestKeywordIntent:
    def test_animation_keywords(self):
        """Messages with animation-related keywords resolve to ANIMATE."""
        assert _keyword_intent("给我演示一下") == Intent.ANIMATE
        assert _keyword_intent("做个动画来展示") == Intent.ANIMATE
        assert _keyword_intent("可视化神经网络") == Intent.ANIMATE
        assert _keyword_intent("动态演示") == Intent.ANIMATE

    def test_picture_book_keywords(self):
        """Messages with story keywords resolve to PICTURE_BOOK."""
        assert _keyword_intent("讲个绘本故事") == Intent.PICTURE_BOOK
        assert _keyword_intent("给我说个故事") == Intent.PICTURE_BOOK
        assert _keyword_intent("讲故事吧") == Intent.PICTURE_BOOK

    def test_code_keywords(self):
        """Messages with coding keywords resolve to CODE."""
        assert _keyword_intent("写段代码") == Intent.CODE
        assert _keyword_intent("编程") == Intent.CODE
        assert _keyword_intent("用Python写程序") == Intent.CODE
        assert _keyword_intent("运行这段代码") == Intent.CODE
        assert _keyword_intent("帮我debug") == Intent.CODE

    def test_quiz_keywords(self):
        """Messages with quiz keywords resolve to QUIZ."""
        assert _keyword_intent("出几道练习") == Intent.QUIZ
        assert _keyword_intent("来测验一下") == Intent.QUIZ
        assert _keyword_intent("给我考题") == Intent.QUIZ
        assert _keyword_intent("做道测试题") == Intent.QUIZ
        assert _keyword_intent("题目") == Intent.QUIZ

    def test_teach_keywords(self):
        """Messages with teaching keywords resolve to TEACH."""
        assert _keyword_intent("上课了") == Intent.TEACH
        assert _keyword_intent("学习") == Intent.TEACH
        assert _keyword_intent("教我") == Intent.TEACH
        assert _keyword_intent("课程") == Intent.TEACH
        assert _keyword_intent("讲解") == Intent.TEACH

    def test_chat_fallback(self):
        """Messages without specific keywords fall back to CHAT."""
        assert _keyword_intent("你好") == Intent.CHAT
        assert _keyword_intent("今天天气怎么样") == Intent.CHAT
        assert _keyword_intent("") == Intent.CHAT

    def test_case_insensitive(self):
        """Keyword matching is case-insensitive."""
        assert _keyword_intent("PYTHON编程") == Intent.CODE

    def test_first_keyword_wins(self):
        """The first matching keyword in the precedence chain wins."""
        # "动画" checked before "故事", so ANIMATE wins
        assert _keyword_intent("做一个动画故事") == Intent.ANIMATE


class TestExtractTopic:
    def test_exact_topic_match(self):
        """Returns the matched topic when found in the keyword list."""
        assert extract_topic("什么是神经网络") == "神经网络"

    def test_first_topic_wins(self):
        """Returns the first matching topic from the ordered list."""
        assert extract_topic("深度学习和机器学习") == "深度学习"

    def test_no_topic_match(self):
        """Returns first 30 chars of message when no topic matches."""
        assert extract_topic("今天天气怎么样") == "今天天气怎么样"

    def test_short_message(self):
        """Returns the message itself when it's shorter than 30 chars."""
        assert extract_topic("你好") == "你好"

    def test_edge_case_empty_message(self):
        """Returns empty string for empty message."""
        assert extract_topic("") == ""

    def test_common_topics_extracted(self):
        """A representative set of common topics are extractable.
        Use ASCII-bearing topics to avoid cross-platform encoding issues."""
        # Topics containing ASCII characters (reliable across all platforms)
        assert extract_topic("Python怎么安装") == "Python"
        assert extract_topic("什么是CNN") == "CNN"
        assert extract_topic("GAN是什么") == "GAN"
        assert extract_topic("什么是RNN") == "RNN"
        assert extract_topic("Transformer架构详解") == "Transformer"


class TestBuildSystemPrompt:
    def test_chat_intent_prompt(self):
        """CHAT intent includes 自由问答 instructions."""
        prompt = build_system_prompt(GradeLevel.M, Intent.CHAT)
        assert "初中" in prompt
        assert "自由问答" in prompt
        assert "12-15岁" in prompt

    def test_teach_intent_prompt(self):
        """TEACH intent includes structured lesson instructions."""
        prompt = build_system_prompt(GradeLevel.M, Intent.TEACH)
        assert "正式授课" in prompt
        assert "课程结构" in prompt

    def test_animate_intent_prompt(self):
        """ANIMATE intent includes HTML animation instructions."""
        prompt = build_system_prompt(GradeLevel.M, Intent.ANIMATE)
        assert "动画演示" in prompt
        assert "HTML动画" in prompt

    def test_code_intent_prompt(self):
        """CODE intent includes coding instructions."""
        prompt = build_system_prompt(GradeLevel.M, Intent.CODE)
        assert "编程实践" in prompt
        assert "Python" in prompt

    def test_quiz_intent_prompt(self):
        """QUIZ intent includes quiz instructions."""
        prompt = build_system_prompt(GradeLevel.M, Intent.QUIZ)
        assert "练习测验" in prompt

    def test_different_grade_levels(self):
        """Each grade level produces different prompts."""
        p1 = build_system_prompt(GradeLevel.P1, Intent.CHAT)
        p2 = build_system_prompt(GradeLevel.P2, Intent.CHAT)
        m = build_system_prompt(GradeLevel.M, Intent.CHAT)
        h = build_system_prompt(GradeLevel.H, Intent.CHAT)
        assert p1 != p2
        assert p2 != m
        assert m != h

    def test_prompt_contains_max_tokens(self):
        """Each prompt tells the model about the max token limit."""
        for grade in GradeLevel:
            prompt = build_system_prompt(grade, Intent.CHAT)
            assert str(GRADE_PROFILES[grade]["max_tokens"]) in prompt
