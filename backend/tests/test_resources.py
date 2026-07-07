"""
Tests for resources.py — PPT/Word generation helpers (non-LLM).
"""

import sys
import os
import io
import zipfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.resources import _xml_escape, _build_minimal_pptx_zip, _make_simple_docx


class TestXmlEscape:
    def test_ampersand(self):
        assert _xml_escape("A & B") == "A &amp; B"

    def test_lessthan(self):
        assert _xml_escape("x < 5") == "x &lt; 5"

    def test_greaterthan(self):
        assert _xml_escape("x > 5") == "x &gt; 5"

    def test_double_quote(self):
        assert _xml_escape('say "hello"') == "say &quot;hello&quot;"

    def test_multiple_special_chars(self):
        result = _xml_escape('<script>alert("XSS & more")</script>')
        expected = "&lt;script&gt;alert(&quot;XSS &amp; more&quot;)&lt;/script&gt;"
        assert result == expected

    def test_no_special_chars(self):
        """Returns unchanged string when nothing to escape."""
        assert _xml_escape("Hello World") == "Hello World"

    def test_chinese_text(self):
        """Chinese text passes through without encoding issues."""
        assert _xml_escape("人工智能") == "人工智能"

    def test_empty_string(self):
        """Empty string stays empty."""
        assert _xml_escape("") == ""


def _read_zip_entry(zip_bytes, path):
    """Read a text entry from a ZIP file and decode as UTF-8."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        return z.read(path).decode("utf-8")


class TestBuildMinimalPptxZip:
    def test_basic_pptx_structure(self):
        """Produces a valid ZIP with expected PPTX internal structure."""
        content = {
            "title": "AI基础教学",
            "slides": [
                {"heading": "什么是AI", "bullets": ["人工智能简介", "AI的发展历史"]},
                {"heading": "机器学习", "bullets": ["监督学习", "无监督学习", "强化学习"]},
            ],
        }
        result = _build_minimal_pptx_zip(content)
        assert isinstance(result, bytes)
        assert len(result) > 1000

        buf = io.BytesIO(result)
        with zipfile.ZipFile(buf) as z:
            names = z.namelist()
            assert "[Content_Types].xml" in names
            assert "_rels/.rels" in names
            assert "ppt/presentation.xml" in names
            assert "ppt/slides/slide1.xml" in names
            assert "ppt/slides/slide2.xml" in names
            assert "ppt/slides/slide3.xml" in names  # title + 2 content slides

    def test_single_slide(self):
        """Works with only a title (no content slides)."""
        content = {"title": "单页PPT", "slides": []}
        result = _build_minimal_pptx_zip(content)
        buf = io.BytesIO(result)
        with zipfile.ZipFile(buf) as z:
            names = z.namelist()
            assert "ppt/slides/slide1.xml" in names

    def test_empty_title(self):
        """Does not crash with empty title."""
        result = _build_minimal_pptx_zip({"title": "", "slides": []})
        assert len(result) > 0

    def test_chinese_content(self):
        """Chinese characters survive the round-trip in the generated PPTX."""
        content = {
            "title": "人工智能通识课",
            "slides": [{"heading": "神经网络基础", "bullets": ["感知机模型", "激活函数ReLU"]}],
        }
        result = _build_minimal_pptx_zip(content)
        # Decompress and read slide XML to verify content
        slide2 = _read_zip_entry(result, "ppt/slides/slide2.xml")
        assert "神经网络基础" in slide2

    def test_special_chars_in_content(self):
        """XML special chars in content are escaped."""
        content = {
            "title": "x < y & z",
            "slides": [{"heading": '测试 "引号"', "bullets": ["a > b & c"]}],
        }
        result = _build_minimal_pptx_zip(content)
        # Decompress and read the slide
        slide2 = _read_zip_entry(result, "ppt/slides/slide2.xml")
        # The test heading is '测试 "引号"' (+ quotes)
        # The bullet is 'a > b & c' (+ > and &)
        assert "&gt;" in slide2  # > is in bullet text
        assert "&amp;" in slide2  # & is in bullet text
        assert "&quot;" in slide2  # " is in heading text
        # Note: &lt; not present because no < in the test input


class TestMakeSimpleDocx:
    def test_basic_docx_structure(self):
        """Produces a valid ZIP with expected DOCX internal structure."""
        data = {
            "title": "AI教学文档",
            "objectives": ["了解AI的基本概念", "理解机器学习"],
            "concepts": [{"term": "AI", "explanation": "人工智能"}],
            "content": "这是详细内容。",
            "example": "生活中的例子",
            "questions": ["什么是AI？"],
        }
        result = _make_simple_docx(data)
        assert isinstance(result, bytes)
        assert len(result) > 500

        buf = io.BytesIO(result)
        with zipfile.ZipFile(buf) as z:
            names = z.namelist()
            assert "word/document.xml" in names
            assert "_rels/.rels" in names
            assert "[Content_Types].xml" in names

    def test_chinese_content(self):
        """Chinese characters are preserved in the generated DOCX."""
        data = {
            "title": "人工智能课程",
            "objectives": [],
            "concepts": [],
            "content": "人工智能是计算机科学的一个分支。",
            "example": "",
            "questions": [],
        }
        result = _make_simple_docx(data)
        doc_xml = _read_zip_entry(result, "word/document.xml")
        assert "人工智能" in doc_xml

    def test_empty_document(self):
        """Works with essentially empty content."""
        result = _make_simple_docx({
            "title": "空文档", "objectives": [],
            "concepts": [], "content": "", "example": "", "questions": [],
        })
        assert len(result) > 0

    def test_special_chars_escaped(self):
        """XML special characters are escaped in the document."""
        data = {
            "title": "x < y & z",
            "objectives": [],
            "concepts": [],
            "content": 'test "quotes"',
            "example": "",
            "questions": [],
        }
        result = _make_simple_docx(data)
        doc_xml = _read_zip_entry(result, "word/document.xml")
        assert "&lt;" in doc_xml
        assert "&amp;" in doc_xml
