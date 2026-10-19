"""Prompt, answer schema and answer parsing shared by every LLM engine."""

import json
import re

SYSTEM_PROMPT = """You classify app store reviews of a mobile app.
Pick exactly one primary_category: the single main problem the reviewer complains about.
Add up to 2 secondary_categories only if the review clearly names other distinct problems; otherwise use an empty list. Never repeat the primary category there.
If the review contains no complaint, set is_complaint to false and primary_category to "other".
The review may be in any language or mixed languages (for example Tamil, Hindi, Tanglish or Hinglish). Understand it as written. Do not translate it back.
summary: one plain English sentence of at most 15 words describing the problem, without quoting the user and without names.
Use only the category ids listed below. Answer with JSON only.

Categories:
{category_block}"""

USER_PROMPT = '''Rating: {rating}/5
App version: {app_version}
Review:
"""{text}"""'''

FENCE_RE = re.compile(r"```(?:json)?", re.IGNORECASE)


def category_line(category: dict) -> str:
    """'- id (Label): description', leaving the label out when it just repeats the id."""
    plain = category["id"].replace("_", " ").lower()
    label = "" if category["label"].lower() == plain else f" ({category['label']})"
    return f"- {category['id']}{label}: {category['description']}"


def system_prompt(categories: list[dict]) -> str:
    """System prompt with one line per category."""
    return SYSTEM_PROMPT.replace("{category_block}", "\n".join(category_line(c) for c in categories))


def user_prompt(review: dict) -> str:
    """User prompt for one clean-CSV review row."""
    return (USER_PROMPT.replace("{rating}", str(review["rating"]))
            .replace("{app_version}", review.get("app_version") or "unknown")
            .replace("{text}", review["text"]))


def answer_schema(categories: list[dict]) -> dict:
    """JSON schema the answer must follow (enum filled from the configured category ids)."""
    ids = [c["id"] for c in categories]
    return {
        "type": "object",
        "properties": {
            "primary_category": {"type": "string", "enum": ids},
            "secondary_categories": {"type": "array", "items": {"type": "string", "enum": ids}},
            "is_complaint": {"type": "boolean"},
            "sentiment": {"type": "string", "enum": ["negative", "mixed", "neutral", "positive"]},
            "summary": {"type": "string"},
        },
        "required": ["primary_category", "secondary_categories", "is_complaint", "sentiment", "summary"],
        "additionalProperties": False,
    }


def parse_json_answer(text: str) -> dict:
    """Strip ``` fences and any text around the outermost {...}, then parse it (ValueError on failure)."""
    text = FENCE_RE.sub("", text or "")
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end < start:
        raise ValueError("no JSON object in answer")
    answer = json.loads(text[start:end + 1])
    if not isinstance(answer, dict):
        raise ValueError("answer is not a JSON object")
    return answer
