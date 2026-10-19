"""Engine: a local model served by Ollama. Settings: [engines.ollama] plus [classify]."""

import requests

from engines import AttemptFailed, EngineUnavailable
from engines.llm_prompt import answer_schema, parse_json_answer, system_prompt, user_prompt

CONFIG_KEYS = ["engines.ollama.url", "engines.ollama.model"]
UNAVAILABLE_HINT = "Ollama is not running. Open the Ollama app or run ollama serve, then retry."


def label(cfg: dict) -> str:
    """The model tag, stored in the `model` column."""
    return cfg["engines"]["ollama"]["model"]


def _url(cfg: dict, path: str) -> str:
    return f"{cfg['engines']['ollama']['url'].rstrip('/')}{path}"


def check(cfg: dict) -> None:
    """Make sure Ollama answers and the configured model is pulled."""
    try:
        response = requests.get(_url(cfg, "/api/tags"), timeout=5)
        response.raise_for_status()
        names = {m.get("name") for m in response.json().get("models", [])}
    except (requests.ConnectionError, requests.Timeout):
        raise EngineUnavailable(UNAVAILABLE_HINT)
    except (requests.RequestException, ValueError) as e:
        raise EngineUnavailable(f"Ollama answered unexpectedly ({e}). Restart Ollama and retry.")
    model = label(cfg)
    if model not in names and f"{model}:latest" not in names:
        raise EngineUnavailable(f"Model {model} not found. Run: ollama pull {model}")


def classify(cfg: dict, review: dict, categories: list[dict]) -> dict:
    """Send one review to /api/chat with a JSON-schema format and return the parsed answer."""
    settings = cfg["classify"]
    body = {
        "model": label(cfg),
        "stream": False,
        "format": answer_schema(categories),
        "options": {"temperature": settings.get("temperature", 0)},
        "messages": [{"role": "system", "content": system_prompt(categories)},
                     {"role": "user", "content": user_prompt(review)}],
    }
    timeout = settings.get("request_timeout_sec", 120)
    try:
        response = requests.post(_url(cfg, "/api/chat"), json=body, timeout=timeout)
        response.raise_for_status()
        return parse_json_answer(response.json()["message"]["content"])
    except requests.Timeout:
        raise AttemptFailed(f"timed out after {timeout}s")
    except requests.RequestException as e:
        raise AttemptFailed(f"request failed: {e}")
    except (ValueError, KeyError, TypeError) as e:
        raise AttemptFailed(f"bad answer: {e}")
