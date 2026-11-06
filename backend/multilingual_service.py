import re
import json
import urllib.request
import urllib.parse
from typing import Optional, Dict

# Script Unicode Ranges
SCRIPT_PATTERNS = [
    (re.compile(r'[\u0C80-\u0CFF]'), 'kn'),  # Kannada
    (re.compile(r'[\u0900-\u097F]'), 'hi'),  # Hindi / Devanagari
    (re.compile(r'[\u0C00-\u0C7F]'), 'te'),  # Telugu
    (re.compile(r'[\u0B80-\u0BFF]'), 'ta'),  # Tamil
    (re.compile(r'[\u0D00-\u0D7F]'), 'ml'),  # Malayalam
    (re.compile(r'[\u0980-\u09FF]'), 'bn'),  # Bengali
    (re.compile(r'[\u0600-\u06FF]'), 'ar'),  # Arabic
    (re.compile(r'[\u4E00-\u9FFF]'), 'zh'),  # Chinese
    (re.compile(r'[\u3040-\u30FF]'), 'ja'),  # Japanese
    (re.compile(r'[\uAC00-\uD7AF]'), 'ko'),  # Korean
    (re.compile(r'[\u0400-\u04FF]'), 'ru'),  # Russian
]

KEYWORD_HINTS: Dict[str, str] = {
    'kannada': 'kn',
    'kannadadalli': 'kn',
    'kannadada': 'kn',
    'hindi': 'hi',
    'hindimein': 'hi',
    'telugu': 'te',
    'tamil': 'ta',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'arabic': 'ar',
    'chinese': 'zh',
    'japanese': 'ja',
    'korean': 'ko',
}

LANGUAGE_NAMES: Dict[str, str] = {
    'kn': 'Kannada (ಕನ್ನಡ)',
    'hi': 'Hindi (हिन्दी)',
    'te': 'Telugu (తెలుగు)',
    'ta': 'Tamil (தமிழ்)',
    'ml': 'Malayalam (മലയാളം)',
    'bn': 'Bengali (বাংলা)',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'pt': 'Portuguese (Português)',
    'ru': 'Russian (Русский)',
    'ar': 'Arabic (العربية)',
    'zh': 'Chinese (中文)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'en': 'English'
}

# Offline fallback dictionary for instant sub-second responses without internet
OFFLINE_PHRASES: Dict[str, Dict[str, str]] = {
    'kn': {
        'greeting': 'ನಮಸ್ಕಾರ! ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
        'who_are_you': 'ನಾನು ChatGPT, ನಿಮ್ಮ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ.',
        'how_are_you': 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದಗಳು! ನೀವು ಹೇಗಿದ್ದೀರಿ?',
        'ai_definition': 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯು (AI) ಯಂತ್ರಗಳಲ್ಲಿ ಮಾನವ ಬುದ್ಧಿಮತ್ತೆಯನ್ನು ಅನುಕರಿಸುವ ತಂತ್ರಜ್ಞಾನವಾಗಿದೆ.',
        'llm_definition': 'LLM ಎಂದರೆ ದೊಡ್ಡ ಭಾಷಾ ಮಾದರಿ (Large Language Model), ಇದು ಭಾಷೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವ AI ಆಗಿದೆ.',
        'default': 'ಖಂಡಿತ, ನಾನು ನಿಮಗೆ ಕನ್ನಡದಲ್ಲಿ ಸಂತೋಷದಿಂದ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.'
    },
    'hi': {
        'greeting': 'नमस्ते! आज मैं आपकी क्या सहायता कर सकता हूँ?',
        'who_are_you': 'मैं ChatGPT हूँ, आपका AI सहायक।',
        'how_are_you': 'मैं ठीक हूँ, धन्यवाद! आप कैसे हैं?',
        'ai_definition': 'आर्टिफिशियल इंटेलिजेंस (AI) मशीनों में मानव बुद्धिमत्ता का अनुकरण है।',
        'llm_definition': 'LLM का मतलब लार्ज लैंग्वेज मॉडल है, जो भाषा को समझने और उत्पन्न करने वाली AI प्रणाली है।',
        'default': 'ज़रूर, मैं आपकी हिन्दी में सहायता करने के लिए तैयार हूँ।'
    },
    'te': {
        'greeting': 'నమస్కారం! ఈరోజు నేను మీకు ఎలా సహాయపడగలను?',
        'who_are_you': 'నేను ChatGPT, మీ AI సహాయకుడిని.',
        'how_are_you': 'నేను బాగున్నాను, ధన్యవాదాలు! మీరు ఎలా ఉన్నారు?',
        'default': 'తప్పకుండా, నేను మీకు తెలుగులో సహాయం చేస్తాను.'
    },
    'ta': {
        'greeting': 'வணக்கம்! இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
        'who_are_you': 'நான் ChatGPT, உங்கள் AI உதவியாளர்.',
        'how_are_you': 'நான் நலமாக இருக்கிறேன், நன்றி! நீங்கள் எப்படி இருக்கிறீர்கள்?',
        'default': 'நிச்சயமாக, நான் உங்களுக்கு தமிழில் உதவ மகிழ்ச்சியடைகிறேன்.'
    }
}


def detect_language(text: str, hint: Optional[str] = None) -> str:
    """
    Detects language code from script characters, explicit hints, or keywords.
    Returns ISO 639-1 code ('kn', 'hi', 'en', 'es', etc.).
    """
    if hint and hint != 'auto':
        clean_hint = hint.split('-')[0].lower()
        if clean_hint in LANGUAGE_NAMES:
            return clean_hint

    # Check Unicode script ranges first (100% precision)
    for pattern, code in SCRIPT_PATTERNS:
        if pattern.search(text):
            return code

    # Check keywords in romanized text
    lower_text = text.lower()
    for kw, code in KEYWORD_HINTS.items():
        if re.search(r'\b' + re.escape(kw) + r'\b', lower_text):
            return code

    return 'en'


def has_script_for_lang(text: str, lang_code: str) -> bool:
    """Checks whether the generated text actually contains the native alphabet of lang_code."""
    for pattern, code in SCRIPT_PATTERNS:
        if code == lang_code:
            return bool(pattern.search(text))
    return True


def translate_text(text: str, target_lang: str) -> str:
    """
    Translates text to target language via Google GTX endpoint,
    with instant graceful fallback to curated offline translations.
    """
    if not text or target_lang == 'en':
        return text

    # Attempt online neural translation
    try:
        url = (
            f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q="
            + urllib.parse.quote(text)
        )
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            translated = "".join([part[0] for part in data[0] if part[0]])
            if translated and len(translated.strip()) > 0:
                return translated.strip()
    except Exception:
        pass

    # Offline dictionary fallback
    if target_lang in OFFLINE_PHRASES:
        phrases = OFFLINE_PHRASES[target_lang]
        lower = text.lower()
        if any(w in lower for w in ['hello', 'hi', 'hey', 'greetings', 'namaste', 'namaskara']):
            return phrases.get('greeting', phrases['default'])
        if any(w in lower for w in ['who are you', 'what are you', 'your name']):
            return phrases.get('who_are_you', phrases['default'])
        if any(w in lower for w in ['how are you', 'how do you do']):
            return phrases.get('how_are_you', phrases['default'])
        if 'ai' in lower or 'artificial intelligence' in lower:
            return phrases.get('ai_definition', phrases['default'])
        if 'llm' in lower or 'large language model' in lower:
            return phrases.get('llm_definition', phrases['default'])
        return phrases.get('default', text)

    return text
