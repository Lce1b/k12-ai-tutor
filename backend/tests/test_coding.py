"""
Tests for coding.py — code templates, safety check, sandbox (non-LLM).
"""

import sys
import os
import re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.coding import (
    get_code_templates,
    get_template_by_id,
    CODE_CHECK_RE,
    CODE_TEMPLATES,
)


class TestCodeTemplates:
    def test_get_all_templates(self):
        """Returns all templates when no grade filter."""
        templates = get_code_templates()
        assert isinstance(templates, list)
        assert len(templates) == 5  # bubble_sort, simple_neural, image_classifier, gradient_descent, decision_tree

    def test_filter_by_primary_high(self):
        """Filters templates to those suitable for 小学高年级."""
        templates = get_code_templates("primary_high")
        ids = {t["id"] for t in templates}
        assert ids == {"bubble_sort", "decision_tree"}

    def test_filter_by_middle(self):
        """Filters templates to those suitable for 初中."""
        templates = get_code_templates("middle")
        ids = {t["id"] for t in templates}
        assert ids == {"bubble_sort", "simple_neural", "image_classifier", "gradient_descent", "decision_tree"}

    def test_filter_by_high(self):
        """Filters templates to those suitable for 高中."""
        templates = get_code_templates("high")
        ids = {t["id"] for t in templates}
        assert ids == {"bubble_sort", "simple_neural", "image_classifier", "gradient_descent", "decision_tree"}

    def test_filter_by_primary_low(self):
        """小学低年级 has no templates (empty list)."""
        templates = get_code_templates("primary_low")
        assert len(templates) == 0

    def test_filter_unknown_grade(self):
        """Unknown grade returns empty list."""
        templates = get_code_templates("kindergarten")
        assert len(templates) == 0

    def test_template_shape(self):
        """Each template has id, title, explanation, challenge."""
        templates = get_code_templates()
        for t in templates:
            assert "id" in t
            assert "title" in t
            assert "explanation" in t
            assert "challenge" in t


class TestGetTemplateById:
    def test_existing_template(self):
        """Returns full template data for a valid ID."""
        tmpl = get_template_by_id("bubble_sort")
        assert tmpl is not None
        assert tmpl["id"] == "bubble_sort"
        assert tmpl["title"] == "冒泡排序可视化"
        assert "code" in tmpl
        assert "expected_output" in tmpl
        assert "challenge" in tmpl

    def test_code_is_nonempty(self):
        """Each template has actual runnable code."""
        for template_id in CODE_TEMPLATES:
            tmpl = get_template_by_id(template_id)
            assert tmpl is not None
            assert len(tmpl["code"]) > 20, f"{template_id} has too short code"

    def test_nonexistent_template(self):
        """Returns None for unknown template ID."""
        assert get_template_by_id("nonexistent") is None

    def test_empty_string_id(self):
        """Returns None for empty string ID."""
        assert get_template_by_id("") is None

    def test_all_templates_have_expected_output(self):
        """Every template has a non-empty expected_output for self-validation."""
        for template_id in CODE_TEMPLATES:
            tmpl = get_template_by_id(template_id)
            assert tmpl is not None
            assert len(tmpl["expected_output"]) > 0, f"{template_id} has empty expected_output"


class TestCodeSafety:
    def test_blocked_os_module(self):
        """Blocks import os in student code."""
        assert CODE_CHECK_RE.search("import os")
        assert CODE_CHECK_RE.search("from os import path")

    def test_blocked_subprocess(self):
        """Blocks import subprocess."""
        assert CODE_CHECK_RE.search("import subprocess")
        assert CODE_CHECK_RE.search("from subprocess import run")

    def test_blocked_socket(self):
        """Blocks socket networking."""
        assert CODE_CHECK_RE.search("import socket")

    def test_blocked_pickle(self):
        """Blocks pickle for security."""
        assert CODE_CHECK_RE.search("import pickle")

    def test_safe_imports_allowed(self):
        """Safe imports like math, random, collections are allowed."""
        assert not CODE_CHECK_RE.search("import math")
        assert not CODE_CHECK_RE.search("from collections import Counter")
        assert not CODE_CHECK_RE.search("import random")

    def test_blocked_keyword_in_string(self):
        """regex matches the import keyword, not just word occurrences."""
        # "os" as part of "toss" would match the regex, which is acceptable
        assert CODE_CHECK_RE.search("import os")
