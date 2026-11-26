import re
import random

# Multi-language Bad Words List (English, Hinglish/Hindi, Spanish, French, German, etc.)
PROFANITY_WORDS = set([
    # English
    "fuck", "fucker", "fucking", "shit", "bitch", "bastard", "asshole", "cunt", "dick", "pussy",
    "cock", "motherfucker", "whore", "slut", "bullshit", "douche", "nigger", "faggot", "wanker",
    # Hinglish / Hindi
    "chutiya", "bhenchod", "madarchod", "gandu", "bhosdike", "harami", "kutta", "kamina", "lauda",
    "lode", "gaand", "chut", "saala", "bakchod", "mc", "bc", "gaandu", "saale",
    # Spanish
    "mierda", "puta", "pendejo", "cabron", "maricon", "joder", "coño",
    # French
    "merde", "putain", "salope", "connard", "enculè",
    # German
    "scheisse", "arschloch", "fick", "hurensohn"
])

# Crisis & Self-Harm Indicators
CRISIS_PATTERNS = [
    r"want to die", r"wanna die", r"kill myself", r"end my life", r"suicide",
    r"dont want to live", r"don't want to live", r"want to end it all",
    r"no reason to live", r"better off dead", r"cutting myself", r"self harm",
    r"marna hai", r"mar jana hai", r"mar jana chahta", r"zindagi khatam",
    r"suicidal", r"end it all", r"die tonight", r"take my life"
]

HELPLINE_RESOURCES = {
    "title": "You Are Not Alone - We Are Here For You 💙",
    "description": "It sounds like you're going through a really tough time right now. Please know that your life has value, and there are caring professionals available 24/7 to support you unconditionally.",
    "contacts": [
        {"name": "Tele-MANAS (India 24/7)", "number": "14416 / 1800-891-4416"},
        {"name": "988 Suicide & Crisis Lifeline (US & Canada)", "number": "988"},
        {"name": "Befrienders Worldwide (Global)", "website": "https://www.befrienders.org"},
        {"name": "Vandrevala Foundation (India)", "number": "+91 9999 666 555"},
        {"name": "KIRAN Mental Health Helpline", "number": "1800-599-0019"}
    ],
    "immediate_tips": [
        "Take 5 deep breaths in for 4 seconds, hold for 4 seconds, and release for 6 seconds.",
        "Reach out to a trusted friend, family member, or healthcare professional.",
        "Talk to MindBot right now in the chat box on your screen for immediate support."
    ]
}

def analyze_text(text: str) -> dict:
    """
    Analyzes text for:
    1. Crisis / Self-Harm intent
    2. Profanity / Bad words across multiple languages
    """
    cleaned_text = text.lower()
    
    # 1. Check for Crisis Patterns first
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, cleaned_text):
            return {
                "status": "crisis",
                "blocked": True,
                "reason": "crisis_detected",
                "message": "It looks like you are experiencing severe emotional distress or suicidal thoughts. We care deeply about your safety.",
                "resources": HELPLINE_RESOURCES
            }
            
    # 2. Check for Bad Words / Profanity
    words = re.findall(r'\b\w+\b', cleaned_text)
    detected_bad_words = [word for word in words if word in PROFANITY_WORDS]
    
    # Check regex sub-matching for hidden profanity
    if not detected_bad_words:
        for bad_word in PROFANITY_WORDS:
            if len(bad_word) > 3 and bad_word in cleaned_text:
                detected_bad_words.append(bad_word)
                
    if detected_bad_words:
        return {
            "status": "bad_word",
            "blocked": True,
            "reason": "profanity_detected",
            "detected_words": list(set(detected_bad_words)),
            "message": f"Your message contains prohibited or offensive language ('{', '.join(set(detected_bad_words))}'). MindSpace is a respectful & safe environment."
        }
        
    # 3. Clean Text
    return {
        "status": "clean",
        "blocked": False,
        "reason": None,
        "message": "Message is clean and safe to post."
    }

MINDBOT_RESPONSES = {
    "crisis": [
        "I hear how much pain you are in right now, and I want you to know that you don't have to carry this alone. Please reach out to one of our emergency helplines or talk to someone you trust.",
        "Your life matters, even when everything feels impossibly dark. Please let a crisis counselor support you right now. Dial 988 or 14416 (India) for immediate help."
    ],
    "sadness": [
        "It's completely okay to feel sad and overwhelmed sometimes. Thank you for expressing your feelings here. What's been weighing most heavily on your mind?",
        "I'm sending you warmth and virtual support. Remember that feelings come and go like waves. Take a deep breath—you are stronger than you know."
    ],
    "anxiety": [
        "Anxiety can feel so suffocating, but you are safe right now in this moment. Try grounding yourself: name 3 things you can see around you and take a slow deep breath.",
        "Your feelings are valid. Take a pause, unclench your jaw, relax your shoulders. I'm here listening if you want to vent more."
    ],
    "general": [
        "Thank you for sharing your thoughts on MindSpace. I am MindBot, your AI emotional support companion. How are you feeling today?",
        "MindSpace is your safe space to express whatever is on your mind anonymously. How can I support you right now?",
        "I'm here for you! You can share your story, vent about your day, or just talk about how you're feeling."
    ]
}

def generate_mindbot_reply(user_message: str) -> str:
    """
    Generates an empathetic AI MindBot reply based on user sentiment analysis.
    """
    analysis = analyze_text(user_message)
    if analysis["status"] == "crisis":
        return random.choice(MINDBOT_RESPONSES["crisis"])
        
    lowered = user_message.lower()
    if any(k in lowered for k in ["sad", "depressed", "lonely", "crying", "hurt", "pain", "broken", "alone"]):
        return random.choice(MINDBOT_RESPONSES["sadness"])
    elif any(k in lowered for k in ["anxious", "scared", "fear", "panic", "stress", "worried", "nervous"]):
        return random.choice(MINDBOT_RESPONSES["anxiety"])
    else:
        return random.choice(MINDBOT_RESPONSES["general"])