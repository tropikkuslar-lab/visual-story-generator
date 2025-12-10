"""
Gelişmiş Türkçe NLP Analiz Modülü
- Morfolojik analiz
- Cümle yapısı analizi
- Bağlam farkındalığı
- Semantic role labeling
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from enum import Enum
import re
from collections import defaultdict

# ============== ENUM VE DATACLASS TANIMLARI ==============

class WordType(str, Enum):
    NOUN = "noun"           # İsim
    VERB = "verb"           # Fiil
    ADJECTIVE = "adj"       # Sıfat
    ADVERB = "adv"          # Zarf
    PRONOUN = "pron"        # Zamir
    CONJUNCTION = "conj"    # Bağlaç
    POSTPOSITION = "post"   # Edat
    INTERJECTION = "interj" # Ünlem
    NUMBER = "num"          # Sayı
    UNKNOWN = "unknown"

class TenseType(str, Enum):
    PAST = "past"               # Geçmiş
    PRESENT = "present"         # Şimdiki
    FUTURE = "future"           # Gelecek
    PAST_PERFECT = "past_perf"  # Miş'li geçmiş
    AORIST = "aorist"           # Geniş zaman
    IMPERATIVE = "imperative"   # Emir
    WISH = "wish"               # Dilek/istek
    NECESSITY = "necessity"     # Gereklilik
    UNKNOWN = "unknown"

class VoiceType(str, Enum):
    ACTIVE = "active"       # Etken
    PASSIVE = "passive"     # Edilgen
    CAUSATIVE = "causative" # Ettirgen
    REFLEXIVE = "reflexive" # Dönüşlü
    RECIPROCAL = "reciprocal" # İşteş

class SentenceType(str, Enum):
    DECLARATIVE = "declarative"     # Bildirme
    INTERROGATIVE = "interrogative" # Soru
    IMPERATIVE = "imperative"       # Emir
    EXCLAMATORY = "exclamatory"     # Ünlem
    OPTATIVE = "optative"           # Dilek

@dataclass
class Word:
    """Kelime analizi sonucu"""
    text: str
    lemma: str                      # Kök
    word_type: WordType
    suffixes: List[str] = field(default_factory=list)
    tense: Optional[TenseType] = None
    voice: Optional[VoiceType] = None
    is_negated: bool = False
    person: Optional[int] = None    # 1, 2, 3
    plural: bool = False
    case: Optional[str] = None      # nominative, accusative, dative, locative, ablative, genitive
    confidence: float = 1.0

@dataclass
class Phrase:
    """Öbek analizi"""
    text: str
    phrase_type: str  # NP (noun phrase), VP (verb phrase), PP (postpositional phrase)
    head: str         # Ana kelime
    modifiers: List[str] = field(default_factory=list)
    role: Optional[str] = None  # subject, object, predicate, adverbial

@dataclass
class Sentence:
    """Cümle analizi sonucu"""
    text: str
    sentence_type: SentenceType
    words: List[Word] = field(default_factory=list)
    phrases: List[Phrase] = field(default_factory=list)
    subject: Optional[str] = None
    predicate: Optional[str] = None
    objects: List[str] = field(default_factory=list)
    adverbials: List[str] = field(default_factory=list)
    tense: Optional[TenseType] = None
    is_negative: bool = False
    is_passive: bool = False
    complexity_score: float = 0.0

@dataclass
class AnalysisResult:
    """Tam metin analizi sonucu"""
    text: str
    sentences: List[Sentence] = field(default_factory=list)
    entities: Dict[str, List[str]] = field(default_factory=dict)  # PERSON, LOCATION, TIME, etc.
    themes: List[str] = field(default_factory=list)
    mood: str = "neutral"
    mood_intensity: float = 0.5
    time_setting: Optional[str] = None
    location_setting: Optional[str] = None
    characters: List[Dict] = field(default_factory=list)
    actions: List[Dict] = field(default_factory=list)
    visual_elements: List[str] = field(default_factory=list)
    atmosphere: Dict[str, str] = field(default_factory=dict)
    confidence: float = 0.0


# ============== TÜRKÇE MORFOLOJİ ==============

class TurkishMorphology:
    """Türkçe morfolojik analiz"""

    # Fiil ekleri
    VERB_SUFFIXES = {
        # Zaman ekleri
        'past': ['-dı', '-di', '-du', '-dü', '-tı', '-ti', '-tu', '-tü'],
        'present': ['-yor', '-iyor', '-uyor', '-üyor'],
        'future': ['-ecek', '-acak', '-yecek', '-yacak'],
        'past_perfect': ['-mış', '-miş', '-muş', '-müş'],
        'aorist': ['-r', '-ar', '-er', '-ır', '-ir', '-ur', '-ür'],
        # Olumsuzluk
        'negative': ['-ma', '-me', '-mı', '-mi'],
        # Edilgen
        'passive': ['-ıl', '-il', '-ul', '-ül', '-n', '-ın', '-in'],
        # Ettirgen
        'causative': ['-dır', '-dir', '-dur', '-dür', '-tır', '-tir', '-tur', '-tür', '-t', '-ıt', '-it'],
    }

    # İsim hal ekleri
    NOUN_CASES = {
        'accusative': ['-ı', '-i', '-u', '-ü', '-yı', '-yi', '-yu', '-yü'],
        'dative': ['-a', '-e', '-ya', '-ye'],
        'locative': ['-da', '-de', '-ta', '-te'],
        'ablative': ['-dan', '-den', '-tan', '-ten'],
        'genitive': ['-ın', '-in', '-un', '-ün', '-nın', '-nin', '-nun', '-nün'],
    }

    # Çoğul ekleri
    PLURAL_SUFFIXES = ['-lar', '-ler']

    # Sıfat yapan ekler
    ADJECTIVE_SUFFIXES = ['-lı', '-li', '-lu', '-lü', '-sız', '-siz', '-suz', '-süz', '-sal', '-sel', '-ık', '-ik', '-uk', '-ük']

    # Zarf yapan ekler
    ADVERB_SUFFIXES = ['-ca', '-ce', '-ça', '-çe', '-casına', '-cesine']

    @classmethod
    def analyze_word(cls, word: str) -> Word:
        """Kelimeyi morfolojik olarak analiz et"""
        text = word.lower().strip()

        # Başlangıç değerleri
        result = Word(
            text=text,
            lemma=text,
            word_type=WordType.UNKNOWN,
            suffixes=[],
            confidence=0.5
        )

        # Fiil mi kontrol et
        verb_info = cls._analyze_verb(text)
        if verb_info:
            result.word_type = WordType.VERB
            result.lemma = verb_info['lemma']
            result.tense = verb_info.get('tense')
            result.is_negated = verb_info.get('negated', False)
            result.voice = verb_info.get('voice')
            result.person = verb_info.get('person')
            result.plural = verb_info.get('plural', False)
            result.suffixes = verb_info.get('suffixes', [])
            result.confidence = 0.8
            return result

        # İsim mi kontrol et
        noun_info = cls._analyze_noun(text)
        if noun_info:
            result.word_type = WordType.NOUN
            result.lemma = noun_info['lemma']
            result.case = noun_info.get('case')
            result.plural = noun_info.get('plural', False)
            result.suffixes = noun_info.get('suffixes', [])
            result.confidence = 0.7
            return result

        # Sıfat mı
        if cls._is_adjective(text):
            result.word_type = WordType.ADJECTIVE
            result.confidence = 0.6

        return result

    @classmethod
    def _analyze_verb(cls, word: str) -> Optional[Dict]:
        """Fiil analizi"""
        result = {'lemma': word, 'suffixes': []}

        # Zaman eki kontrolü
        for tense, suffixes in cls.VERB_SUFFIXES.items():
            if tense in ['past', 'present', 'future', 'past_perfect', 'aorist']:
                for suffix in suffixes:
                    if word.endswith(suffix.replace('-', '')):
                        result['tense'] = TenseType(tense)
                        result['lemma'] = word[:-len(suffix.replace('-', ''))]
                        result['suffixes'].append(suffix)
                        break

        # Tense bulunamadıysa fiil değil
        if 'tense' not in result:
            # Yaygın fiil kökleri kontrolü
            common_verb_roots = ['gel', 'git', 'bak', 'gör', 'al', 'ver', 'yap', 'et', 'ol', 'kal',
                                'bil', 'iste', 'sev', 'düşün', 'anla', 'konuş', 'yürü', 'koş', 'otur', 'kalk']
            for root in common_verb_roots:
                if word.startswith(root):
                    result['lemma'] = root
                    result['tense'] = TenseType.UNKNOWN
                    break
            else:
                return None

        # Olumsuzluk kontrolü
        for neg in cls.VERB_SUFFIXES['negative']:
            neg_clean = neg.replace('-', '')
            if neg_clean in word:
                result['negated'] = True
                result['suffixes'].append(neg)
                break

        # Edilgenlik kontrolü
        for passive in cls.VERB_SUFFIXES['passive']:
            passive_clean = passive.replace('-', '')
            if passive_clean in word and word.index(passive_clean) < len(word) - 3:
                result['voice'] = VoiceType.PASSIVE
                result['suffixes'].append(passive)
                break

        # Kişi eki
        if word.endswith('m'):
            result['person'] = 1
        elif word.endswith('n') or word.endswith('sın') or word.endswith('sin'):
            result['person'] = 2
        elif word.endswith('lar') or word.endswith('ler'):
            result['person'] = 3
            result['plural'] = True
        else:
            result['person'] = 3

        return result

    @classmethod
    def _analyze_noun(cls, word: str) -> Optional[Dict]:
        """İsim analizi"""
        result = {'lemma': word, 'suffixes': []}

        # Çoğul kontrolü
        for plural in cls.PLURAL_SUFFIXES:
            plural_clean = plural.replace('-', '')
            if word.endswith(plural_clean):
                result['plural'] = True
                result['lemma'] = word[:-len(plural_clean)]
                result['suffixes'].append(plural)
                break

        # Hal eki kontrolü
        lemma = result['lemma']
        for case, suffixes in cls.NOUN_CASES.items():
            for suffix in suffixes:
                suffix_clean = suffix.replace('-', '')
                if lemma.endswith(suffix_clean):
                    result['case'] = case
                    result['lemma'] = lemma[:-len(suffix_clean)]
                    result['suffixes'].append(suffix)
                    return result

        # En az bir özellik varsa isim kabul et
        if result['plural'] or len(word) > 2:
            return result

        return None

    @classmethod
    def _is_adjective(cls, word: str) -> bool:
        """Sıfat kontrolü"""
        for suffix in cls.ADJECTIVE_SUFFIXES:
            if word.endswith(suffix.replace('-', '')):
                return True
        return False


# ============== CÜMLE ANALİZİ ==============

class SentenceAnalyzer:
    """Türkçe cümle yapısı analizi"""

    # Soru kelimeleri
    QUESTION_WORDS = ['mi', 'mı', 'mu', 'mü', 'ne', 'kim', 'nerede', 'nereye', 'nereden',
                      'nasıl', 'niçin', 'neden', 'kaç', 'hangi', 'ne zaman']

    # Bağlaçlar
    CONJUNCTIONS = {
        'coordinating': ['ve', 'ile', 'veya', 'ya da', 'ama', 'fakat', 'ancak', 'lakin', 'oysa', 'halbuki'],
        'subordinating': ['çünkü', 'zira', 'eğer', 'şayet', 'madem', 'ki', 'diye', 'için', 'rağmen'],
        'temporal': ['önce', 'sonra', 'iken', 'ken', 'ınca', 'ince', 'dığında', 'diğinde']
    }

    # Zaman zarfları
    TIME_ADVERBS = {
        'past': ['dün', 'geçen', 'evvel', 'önce', 'eskiden', 'geçmişte', 'o gün', 'o zaman'],
        'present': ['şimdi', 'şu an', 'bugün', 'hala', 'henüz', 'tam', 'şu anda'],
        'future': ['yarın', 'gelecek', 'sonra', 'ileride', 'yakında', 'birazdan'],
        'general': ['her zaman', 'bazen', 'nadiren', 'sık sık', 'genellikle', 'asla', 'hiç']
    }

    # Yer zarfları
    PLACE_ADVERBS = ['burada', 'orada', 'şurada', 'içeride', 'dışarıda', 'yukarıda',
                     'aşağıda', 'ileride', 'geride', 'yakında', 'uzakta', 'evde', 'sokakta']

    @classmethod
    def analyze(cls, text: str) -> Sentence:
        """Cümleyi analiz et"""
        text = text.strip()

        result = Sentence(
            text=text,
            sentence_type=cls._detect_sentence_type(text),
            words=[],
            phrases=[],
            complexity_score=0.0
        )

        # Kelimeleri analiz et
        words = cls._tokenize(text)
        for word in words:
            result.words.append(TurkishMorphology.analyze_word(word))

        # Özne, yüklem, nesne bul
        result.subject = cls._find_subject(result.words)
        result.predicate = cls._find_predicate(result.words)
        result.objects = cls._find_objects(result.words)
        result.adverbials = cls._find_adverbials(text)

        # Zaman ve olumsuzluk
        result.tense = cls._determine_tense(result.words, text)
        result.is_negative = cls._is_negative(result.words, text)
        result.is_passive = cls._is_passive(result.words)

        # Karmaşıklık skoru
        result.complexity_score = cls._calculate_complexity(result)

        return result

    @classmethod
    def _tokenize(cls, text: str) -> List[str]:
        """Metni kelimelere ayır"""
        # Noktalama işaretlerini temizle
        text = re.sub(r'[^\w\s]', ' ', text)
        return [w for w in text.split() if w.strip()]

    @classmethod
    def _detect_sentence_type(cls, text: str) -> SentenceType:
        """Cümle türünü tespit et"""
        text_lower = text.lower().strip()

        # Soru işareti veya soru kelimesi
        if '?' in text or any(qw in text_lower for qw in cls.QUESTION_WORDS):
            return SentenceType.INTERROGATIVE

        # Ünlem işareti
        if '!' in text:
            return SentenceType.EXCLAMATORY

        # Emir kipi (fiil kökü + kişi eki)
        imperative_patterns = [r'\b\w+(?:sın|sin|sun|sün)\b', r'\b\w+(?:ınız|iniz|unuz|ünüz)\b']
        for pattern in imperative_patterns:
            if re.search(pattern, text_lower):
                return SentenceType.IMPERATIVE

        # Dilek kipi
        if any(w in text_lower for w in ['keşke', 'umarım', 'inşallah']):
            return SentenceType.OPTATIVE

        return SentenceType.DECLARATIVE

    @classmethod
    def _find_subject(cls, words: List[Word]) -> Optional[str]:
        """Özneyi bul"""
        # Nominative (yalın) haldeki isim
        for word in words:
            if word.word_type == WordType.NOUN and word.case is None:
                return word.text

        # İlk isim
        for word in words:
            if word.word_type == WordType.NOUN:
                return word.text

        return None

    @classmethod
    def _find_predicate(cls, words: List[Word]) -> Optional[str]:
        """Yüklemi bul (genellikle son fiil)"""
        for word in reversed(words):
            if word.word_type == WordType.VERB:
                return word.text
        return None

    @classmethod
    def _find_objects(cls, words: List[Word]) -> List[str]:
        """Nesneleri bul"""
        objects = []
        for word in words:
            if word.word_type == WordType.NOUN and word.case in ['accusative', 'dative']:
                objects.append(word.text)
        return objects

    @classmethod
    def _find_adverbials(cls, text: str) -> List[str]:
        """Zarf tümleçlerini bul"""
        text_lower = text.lower()
        adverbials = []

        # Zaman zarfları
        for category, adverbs in cls.TIME_ADVERBS.items():
            for adv in adverbs:
                if adv in text_lower:
                    adverbials.append(adv)

        # Yer zarfları
        for adv in cls.PLACE_ADVERBS:
            if adv in text_lower:
                adverbials.append(adv)

        return adverbials

    @classmethod
    def _determine_tense(cls, words: List[Word], text: str) -> Optional[TenseType]:
        """Zamanı belirle"""
        text_lower = text.lower()

        # Zaman zarflarına göre
        for adv in cls.TIME_ADVERBS['past']:
            if adv in text_lower:
                return TenseType.PAST

        for adv in cls.TIME_ADVERBS['future']:
            if adv in text_lower:
                return TenseType.FUTURE

        # Fiilden
        for word in reversed(words):
            if word.word_type == WordType.VERB and word.tense:
                return word.tense

        return TenseType.PRESENT

    @classmethod
    def _is_negative(cls, words: List[Word], text: str) -> bool:
        """Olumsuzluk kontrolü"""
        # Fiilde olumsuzluk
        for word in words:
            if word.is_negated:
                return True

        # Olumsuz kelimeler
        negative_words = ['değil', 'yok', 'hiç', 'asla', 'hayır', 'olmaz']
        text_lower = text.lower()
        return any(nw in text_lower for nw in negative_words)

    @classmethod
    def _is_passive(cls, words: List[Word]) -> bool:
        """Edilgenlik kontrolü"""
        for word in words:
            if word.voice == VoiceType.PASSIVE:
                return True
        return False

    @classmethod
    def _calculate_complexity(cls, sentence: Sentence) -> float:
        """Cümle karmaşıklık skoru (0-1)"""
        score = 0.0

        # Kelime sayısı
        word_count = len(sentence.words)
        if word_count > 15:
            score += 0.3
        elif word_count > 8:
            score += 0.2
        elif word_count > 4:
            score += 0.1

        # Birden fazla fiil
        verb_count = sum(1 for w in sentence.words if w.word_type == WordType.VERB)
        if verb_count > 1:
            score += 0.2 * min(verb_count - 1, 3)

        # Bağlaç kullanımı
        text_lower = sentence.text.lower()
        for conj_type, conjs in cls.CONJUNCTIONS.items():
            if any(c in text_lower for c in conjs):
                score += 0.15

        # Edilgen yapı
        if sentence.is_passive:
            score += 0.1

        return min(score, 1.0)


# ============== ENTITY RECOGNITION ==============

class EntityRecognizer:
    """Varlık tanıma (NER)"""

    # Kişi belirteçleri
    PERSON_INDICATORS = ['bey', 'hanım', 'amca', 'teyze', 'dayı', 'hala', 'dede', 'nine',
                         'anne', 'baba', 'kardeş', 'abi', 'abla', 'oğul', 'kız', 'çocuk',
                         'doktor', 'öğretmen', 'mühendis', 'avukat', 'polis', 'asker']

    # Yer belirteçleri
    LOCATION_INDICATORS = ['sokak', 'cadde', 'mahalle', 'şehir', 'köy', 'kasaba', 'ülke',
                           'ev', 'bina', 'okul', 'hastane', 'park', 'bahçe', 'orman', 'deniz',
                           'dağ', 'nehir', 'göl', 'ada', 'mağara', 'kale', 'saray']

    # Zaman belirteçleri
    TIME_INDICATORS = ['sabah', 'öğle', 'akşam', 'gece', 'gün', 'hafta', 'ay', 'yıl',
                       'mevsim', 'ilkbahar', 'yaz', 'sonbahar', 'kış', 'saat']

    # Türk isimleri (yaygın)
    TURKISH_NAMES = {'ali', 'ayşe', 'mehmet', 'fatma', 'mustafa', 'zeynep', 'ahmet', 'elif',
                     'hasan', 'merve', 'hüseyin', 'büşra', 'ibrahim', 'esra', 'ismail', 'gamze',
                     'osman', 'seda', 'yusuf', 'derya', 'murat', 'deniz', 'emre', 'ceren',
                     'can', 'ece', 'berk', 'defne', 'kaan', 'ada', 'arda', 'asya'}

    # Türk şehirleri
    TURKISH_CITIES = {'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'adana', 'konya',
                      'gaziantep', 'mersin', 'diyarbakır', 'kayseri', 'eskişehir', 'samsun',
                      'denizli', 'şanlıurfa', 'malatya', 'trabzon', 'erzurum', 'van', 'batman'}

    @classmethod
    def extract_entities(cls, text: str) -> Dict[str, List[str]]:
        """Metinden varlıkları çıkar"""
        entities = {
            'PERSON': [],
            'LOCATION': [],
            'TIME': [],
            'ORGANIZATION': [],
            'OBJECT': []
        }

        words = text.split()
        text_lower = text.lower()

        for i, word in enumerate(words):
            word_lower = word.lower().strip('.,!?;:')

            # Kişi isimleri
            if word_lower in cls.TURKISH_NAMES:
                entities['PERSON'].append(word)
            elif word[0].isupper() and i > 0:  # Cümle başı değil ve büyük harfle başlıyor
                # Kişi belirteci kontrolü
                if i + 1 < len(words) and words[i + 1].lower() in cls.PERSON_INDICATORS:
                    entities['PERSON'].append(word)
                elif i > 0 and words[i - 1].lower() in cls.PERSON_INDICATORS:
                    entities['PERSON'].append(word)

            # Şehirler
            if word_lower in cls.TURKISH_CITIES:
                entities['LOCATION'].append(word)

            # Yer belirteçleri
            for loc_ind in cls.LOCATION_INDICATORS:
                if loc_ind in word_lower:
                    # Önceki kelimeyi de al
                    if i > 0:
                        entities['LOCATION'].append(f"{words[i-1]} {word}")
                    else:
                        entities['LOCATION'].append(word)
                    break

        # Zaman ifadeleri
        time_patterns = [
            r'\d{1,2}:\d{2}',                    # 14:30
            r'\d{1,2}\s*(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)',
            r'(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)',
            r'(?:sabah|öğle|akşam|gece)\s*(?:saatlerinde|vakti)?',
            r'\d{4}\s*yılı?'                     # 2024 yılı
        ]

        for pattern in time_patterns:
            matches = re.findall(pattern, text_lower)
            entities['TIME'].extend(matches)

        # Tekrarları kaldır
        for key in entities:
            entities[key] = list(set(entities[key]))

        return entities


# ============== THEME VE MOOD ANALİZİ ==============

class ThemeAnalyzer:
    """Tema ve mood analizi"""

    THEMES = {
        'love': {
            'keywords': ['aşk', 'sevgi', 'sev', 'öp', 'sarıl', 'özle', 'tutku', 'romantik', 'kalp', 'gönül'],
            'weight': 1.0
        },
        'death': {
            'keywords': ['ölüm', 'öl', 'cenaze', 'mezar', 'kayıp', 'veda', 'son', 'yas', 'matem'],
            'weight': 1.0
        },
        'war': {
            'keywords': ['savaş', 'mücadele', 'düşman', 'ordu', 'silah', 'zafer', 'yenilgi', 'asker'],
            'weight': 1.0
        },
        'family': {
            'keywords': ['aile', 'anne', 'baba', 'çocuk', 'kardeş', 'ev', 'yuva', 'akraba'],
            'weight': 0.8
        },
        'friendship': {
            'keywords': ['arkadaş', 'dost', 'yoldaş', 'birlikte', 'paylaş', 'güven', 'sadakat'],
            'weight': 0.8
        },
        'adventure': {
            'keywords': ['macera', 'yolculuk', 'keşif', 'gez', 'keşfet', 'bilinmeyen', 'yol'],
            'weight': 0.9
        },
        'mystery': {
            'keywords': ['gizem', 'sır', 'esrar', 'gizemli', 'karanlık', 'bilinmeyen', 'gölge'],
            'weight': 0.9
        },
        'horror': {
            'keywords': ['korku', 'dehşet', 'kabus', 'canavar', 'hayalet', 'lanet', 'ürpertici'],
            'weight': 1.0
        },
        'hope': {
            'keywords': ['umut', 'ışık', 'gelecek', 'başlangıç', 'yeni', 'fırsat', 'şans'],
            'weight': 0.7
        },
        'betrayal': {
            'keywords': ['ihanet', 'aldatma', 'yalan', 'hain', 'dönek', 'güvensizlik', 'arkadan'],
            'weight': 1.0
        },
        'revenge': {
            'keywords': ['intikam', 'öç', 'hesap', 'ceza', 'adalet', 'karşılık'],
            'weight': 1.0
        },
        'redemption': {
            'keywords': ['kurtuluş', 'affet', 'bağışla', 'özür', 'telafi', 'arın', 'yeniden'],
            'weight': 0.9
        },
        'power': {
            'keywords': ['güç', 'iktidar', 'kontrol', 'otorite', 'hükmet', 'kral', 'imparator'],
            'weight': 0.9
        },
        'freedom': {
            'keywords': ['özgürlük', 'özgür', 'serbest', 'bağımsız', 'kaçış', 'kurtul'],
            'weight': 0.8
        },
        'nature': {
            'keywords': ['doğa', 'orman', 'deniz', 'dağ', 'nehir', 'ağaç', 'çiçek', 'hayvan'],
            'weight': 0.7
        }
    }

    MOODS = {
        'joyful': {
            'keywords': ['mutlu', 'sevinç', 'neşe', 'gül', 'kahkaha', 'eğlen', 'coşku', 'şen'],
            'visual': 'bright warm lighting, golden hour, vibrant colors, lens flares',
            'color_palette': ['#FFD700', '#FFA500', '#FF6347', '#FFFF00']
        },
        'melancholic': {
            'keywords': ['hüzün', 'üzgün', 'ağla', 'gözyaşı', 'keder', 'matem', 'yasın', 'acı'],
            'visual': 'soft blue tones, rain, overcast sky, muted colors, shadows',
            'color_palette': ['#4A6FA5', '#6B8E9F', '#8FA7B8', '#A5B9C8']
        },
        'tense': {
            'keywords': ['gerilim', 'tehlike', 'risk', 'korku', 'panik', 'kaç', 'saklan'],
            'visual': 'high contrast, harsh shadows, dutch angles, desaturated colors',
            'color_palette': ['#1A1A2E', '#16213E', '#4A5568', '#2D3748']
        },
        'romantic': {
            'keywords': ['romantik', 'aşk', 'sevgi', 'öpüş', 'sarıl', 'tutku', 'sevgili'],
            'visual': 'soft pink and golden tones, bokeh, dreamy atmosphere, warm glow',
            'color_palette': ['#FFB6C1', '#FFC0CB', '#FF69B4', '#DB7093']
        },
        'mysterious': {
            'keywords': ['gizem', 'sır', 'karanlık', 'bilinmeyen', 'şüphe', 'esrar'],
            'visual': 'fog, shadows, limited visibility, muted dark colors, silhouettes',
            'color_palette': ['#2C3E50', '#34495E', '#5D6D7E', '#7F8C8D']
        },
        'epic': {
            'keywords': ['destan', 'kahraman', 'zafer', 'büyük', 'görkemli', 'muhteşem'],
            'visual': 'dramatic lighting, sweeping vistas, god rays, majestic scale',
            'color_palette': ['#8B4513', '#CD853F', '#DAA520', '#FFD700']
        },
        'peaceful': {
            'keywords': ['huzur', 'sakin', 'dingin', 'rahat', 'sessiz', 'sükunet'],
            'visual': 'soft natural lighting, pastel colors, gentle atmosphere, calm water',
            'color_palette': ['#98D8C8', '#F7DC6F', '#AED6F1', '#D5DBDB']
        },
        'dark': {
            'keywords': ['karanlık', 'kötü', 'şeytan', 'lanet', 'cehennem', 'kara'],
            'visual': 'very low key lighting, deep blacks, ominous shadows, blood red accents',
            'color_palette': ['#1A1A1A', '#2D2D2D', '#8B0000', '#4A0000']
        },
        'nostalgic': {
            'keywords': ['nostalji', 'eski', 'hatıra', 'anı', 'geçmiş', 'çocukluk'],
            'visual': 'sepia tones, film grain, soft vignette, warm vintage colors',
            'color_palette': ['#D4A574', '#C4A35A', '#B8860B', '#DEB887']
        },
        'surreal': {
            'keywords': ['sürreal', 'rüya', 'hayal', 'garip', 'tuhaf', 'fantastik', 'imkansız'],
            'visual': 'impossible geometry, floating objects, unusual colors, dreamlike distortion',
            'color_palette': ['#9B59B6', '#8E44AD', '#3498DB', '#1ABC9C']
        }
    }

    @classmethod
    def analyze_themes(cls, text: str) -> List[Tuple[str, float]]:
        """Temaları analiz et ve skorla"""
        text_lower = text.lower()
        theme_scores = {}

        for theme, data in cls.THEMES.items():
            score = 0.0
            for keyword in data['keywords']:
                count = text_lower.count(keyword)
                if count > 0:
                    score += count * data['weight']

            if score > 0:
                theme_scores[theme] = min(score / 3.0, 1.0)  # Normalize

        # Sırala ve döndür
        sorted_themes = sorted(theme_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_themes[:5]  # Top 5 tema

    @classmethod
    def analyze_mood(cls, text: str) -> Tuple[str, float, Dict]:
        """Mood analizi yap"""
        text_lower = text.lower()
        mood_scores = {}

        for mood, data in cls.MOODS.items():
            score = 0.0
            for keyword in data['keywords']:
                count = text_lower.count(keyword)
                if count > 0:
                    score += count

            if score > 0:
                mood_scores[mood] = score

        if not mood_scores:
            return 'neutral', 0.5, {'visual': 'balanced natural lighting, normal colors', 'color_palette': []}

        # En yüksek skorlu mood
        best_mood = max(mood_scores, key=mood_scores.get)
        intensity = min(mood_scores[best_mood] / 5.0, 1.0)

        return best_mood, intensity, {
            'visual': cls.MOODS[best_mood]['visual'],
            'color_palette': cls.MOODS[best_mood]['color_palette']
        }


# ============== ANA ANALİZ SINIFI ==============

class TurkishTextAnalyzer:
    """Ana Türkçe metin analiz sınıfı"""

    @classmethod
    def analyze(cls, text: str) -> AnalysisResult:
        """Tam metin analizi yap"""
        result = AnalysisResult(text=text)

        # Cümlelere ayır
        sentences = cls._split_sentences(text)

        for sent in sentences:
            sentence_analysis = SentenceAnalyzer.analyze(sent)
            result.sentences.append(sentence_analysis)

        # Varlıkları çıkar
        result.entities = EntityRecognizer.extract_entities(text)

        # Temaları analiz et
        themes = ThemeAnalyzer.analyze_themes(text)
        result.themes = [t[0] for t in themes]

        # Mood analizi
        mood, intensity, mood_details = ThemeAnalyzer.analyze_mood(text)
        result.mood = mood
        result.mood_intensity = intensity
        result.atmosphere = mood_details

        # Zaman ve mekan
        result.time_setting = cls._detect_time_setting(text)
        result.location_setting = cls._detect_location_setting(text, result.entities)

        # Karakterleri çıkar
        result.characters = cls._extract_characters(text, result.entities)

        # Aksiyonları çıkar
        result.actions = cls._extract_actions(result.sentences)

        # Görsel öğeleri çıkar
        result.visual_elements = cls._extract_visual_elements(text)

        # Güven skoru
        result.confidence = cls._calculate_confidence(result)

        return result

    @classmethod
    def _split_sentences(cls, text: str) -> List[str]:
        """Metni cümlelere ayır"""
        # Basit cümle ayırma
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]

    @classmethod
    def _detect_time_setting(cls, text: str) -> Optional[str]:
        """Zaman ayarını tespit et"""
        text_lower = text.lower()

        time_indicators = {
            'morning': ['sabah', 'sabahleyin', 'tan ağar', 'güneş doğ'],
            'afternoon': ['öğle', 'öğleden sonra', 'ikindi'],
            'evening': ['akşam', 'akşamüstü', 'günbatımı', 'güneş bat'],
            'night': ['gece', 'geceleyin', 'karanlık', 'ay ışığı', 'yıldız'],
            'dawn': ['şafak', 'fecir', 'tan vakti'],
            'dusk': ['alacakaranlık', 'akşam karanlığı']
        }

        for time_period, indicators in time_indicators.items():
            for ind in indicators:
                if ind in text_lower:
                    return time_period

        return None

    @classmethod
    def _detect_location_setting(cls, text: str, entities: Dict) -> Optional[str]:
        """Mekan ayarını tespit et"""
        # Entity'lerden yer
        if entities.get('LOCATION'):
            return entities['LOCATION'][0]

        text_lower = text.lower()

        location_types = {
            'indoor': ['ev', 'oda', 'salon', 'mutfak', 'yatak odası', 'ofis', 'bina', 'içeride'],
            'outdoor_urban': ['sokak', 'cadde', 'şehir', 'park', 'meydan', 'köprü'],
            'outdoor_nature': ['orman', 'dağ', 'deniz', 'göl', 'nehir', 'çöl', 'tarla', 'bahçe'],
            'fantasy': ['saray', 'kale', 'zindan', 'büyülü', 'mistik', 'portal'],
            'historical': ['antik', 'harabe', 'tapınak', 'medeniyet']
        }

        for loc_type, indicators in location_types.items():
            for ind in indicators:
                if ind in text_lower:
                    return loc_type

        return None

    @classmethod
    def _extract_characters(cls, text: str, entities: Dict) -> List[Dict]:
        """Karakterleri çıkar"""
        characters = []

        # Entity'lerden kişiler
        for person in entities.get('PERSON', []):
            characters.append({
                'name': person,
                'type': 'named',
                'mentions': text.lower().count(person.lower())
            })

        # Anonim karakterler
        anon_patterns = {
            'protagonist': ['ben', 'bana', 'beni', 'benimle'],
            'female': ['kadın', 'kız', 'hanım', 'anne', 'abla', 'teyze', 'nine'],
            'male': ['adam', 'erkek', 'bey', 'baba', 'abi', 'amca', 'dede'],
            'child': ['çocuk', 'bebek', 'oğlan', 'kız çocuk'],
            'group': ['onlar', 'herkes', 'insanlar', 'kalabalık', 'grup']
        }

        text_lower = text.lower()
        for char_type, patterns in anon_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    characters.append({
                        'name': None,
                        'type': char_type,
                        'pattern': pattern,
                        'mentions': text_lower.count(pattern)
                    })
                    break

        return characters

    @classmethod
    def _extract_actions(cls, sentences: List[Sentence]) -> List[Dict]:
        """Aksiyonları çıkar"""
        actions = []

        for sent in sentences:
            if sent.predicate:
                action = {
                    'verb': sent.predicate,
                    'subject': sent.subject,
                    'objects': sent.objects,
                    'tense': sent.tense.value if sent.tense else 'unknown',
                    'is_negative': sent.is_negative,
                    'is_passive': sent.is_passive
                }
                actions.append(action)

        return actions

    @classmethod
    def _extract_visual_elements(cls, text: str) -> List[str]:
        """Görsel öğeleri çıkar"""
        elements = []
        text_lower = text.lower()

        # Renkler
        colors = {
            'kırmızı': 'red', 'mavi': 'blue', 'yeşil': 'green', 'sarı': 'yellow',
            'siyah': 'black', 'beyaz': 'white', 'mor': 'purple', 'turuncu': 'orange',
            'pembe': 'pink', 'gri': 'gray', 'kahverengi': 'brown', 'altın': 'golden',
            'gümüş': 'silver', 'bronz': 'bronze'
        }

        for tr, en in colors.items():
            if tr in text_lower:
                elements.append(f"color:{en}")

        # Hava durumu
        weather = {
            'yağmur': 'rain', 'kar': 'snow', 'güneş': 'sun', 'bulut': 'clouds',
            'fırtına': 'storm', 'sis': 'fog', 'rüzgar': 'wind', 'şimşek': 'lightning'
        }

        for tr, en in weather.items():
            if tr in text_lower:
                elements.append(f"weather:{en}")

        # Işık
        lighting = {
            'karanlık': 'dark', 'aydınlık': 'bright', 'loş': 'dim', 'parlak': 'bright',
            'gölge': 'shadows', 'ışık': 'light', 'alev': 'fire', 'mum': 'candlelight'
        }

        for tr, en in lighting.items():
            if tr in text_lower:
                elements.append(f"lighting:{en}")

        return elements

    @classmethod
    def _calculate_confidence(cls, result: AnalysisResult) -> float:
        """Analiz güven skorunu hesapla"""
        score = 0.0

        # Cümle analizi kalitesi
        if result.sentences:
            valid_sentences = sum(1 for s in result.sentences if s.predicate)
            score += 0.3 * (valid_sentences / len(result.sentences))

        # Entity zenginliği
        total_entities = sum(len(v) for v in result.entities.values())
        if total_entities > 5:
            score += 0.2
        elif total_entities > 0:
            score += 0.1

        # Tema tespiti
        if result.themes:
            score += 0.2

        # Mood tespiti
        if result.mood != 'neutral':
            score += 0.15

        # Karakter tespiti
        if result.characters:
            score += 0.15

        return min(score, 1.0)


# ============== PROMPT GENERATOR ==============

class SmartPromptGenerator:
    """Akıllı prompt üretici"""

    # Sahne türü -> kamera açısı
    SCENE_TO_CAMERA = {
        'action': ['dynamic angle', 'dutch angle', 'low angle hero shot', 'tracking shot'],
        'dialogue': ['medium shot', 'over-the-shoulder', 'two-shot', 'close-up conversation'],
        'description': ['wide establishing shot', 'panoramic view', 'aerial shot', 'landscape'],
        'emotion': ['extreme close-up', 'intimate portrait', 'soft focus', 'eye-level'],
        'mystery': ['silhouette shot', 'partial view', 'shadow framing', 'obscured view'],
        'epic': ['sweeping crane shot', 'god\'s eye view', 'epic wide angle', 'majestic scale']
    }

    # Mood -> ışıklandırma
    MOOD_TO_LIGHTING = {
        'joyful': 'bright warm sunlight, golden hour, lens flares, cheerful atmosphere',
        'melancholic': 'overcast soft light, blue hour, gentle rain, muted tones',
        'tense': 'harsh shadows, high contrast, dramatic noir lighting, limited light sources',
        'romantic': 'soft pink sunset, diffused warm glow, bokeh background, intimate lighting',
        'mysterious': 'fog and mist, single light source, chiaroscuro, hidden in shadows',
        'epic': 'dramatic god rays, stormy sky, volumetric lighting, majestic scale',
        'peaceful': 'soft natural daylight, pastel colors, gentle shadows, calm atmosphere',
        'dark': 'very low key, deep blacks, red accent lighting, ominous shadows',
        'nostalgic': 'warm sepia tones, soft vignette, film grain effect, vintage lighting',
        'surreal': 'unnatural colored lighting, multiple light sources, dreamlike glow'
    }

    # Tema -> stil
    THEME_TO_STYLE = {
        'love': 'romantic, dreamy, soft colors, warm palette',
        'death': 'somber, muted, dark undertones, melancholic',
        'war': 'gritty, desaturated, harsh, intense',
        'adventure': 'vibrant, dynamic, exciting, bold colors',
        'mystery': 'shadowy, noir, limited palette, atmospheric',
        'horror': 'disturbing, dark, unsettling, ominous',
        'hope': 'uplifting, bright, warm, optimistic colors',
        'power': 'majestic, grand, royal colors, imposing'
    }

    @classmethod
    def generate_prompt(cls, analysis: AnalysisResult, style: str = 'cinematic') -> Dict[str, str]:
        """Analiz sonucundan prompt üret"""

        # Temel öğeler
        subject = cls._build_subject(analysis)
        setting = cls._build_setting(analysis)
        action = cls._build_action(analysis)
        atmosphere = cls._build_atmosphere(analysis)
        technical = cls._build_technical(analysis, style)

        # Ana prompt
        main_prompt = f"{subject}, {action}, {setting}, {atmosphere}, {technical}"

        # Sadık prompt (metne yakın)
        faithful_prompt = cls._build_faithful_prompt(analysis)

        # Yaratıcı prompt (artistik)
        creative_prompt = cls._build_creative_prompt(analysis, style)

        # Negatif prompt
        negative_prompt = cls._build_negative_prompt(analysis, style)

        return {
            'main': main_prompt,
            'faithful': faithful_prompt,
            'creative': creative_prompt,
            'negative': negative_prompt,
            'camera': cls._suggest_camera(analysis),
            'lighting': cls.MOOD_TO_LIGHTING.get(analysis.mood, 'balanced natural lighting'),
            'color_palette': analysis.atmosphere.get('color_palette', [])
        }

    @classmethod
    def _build_subject(cls, analysis: AnalysisResult) -> str:
        """Özne/konu oluştur"""
        parts = []

        # Karakterler
        if analysis.characters:
            for char in analysis.characters[:2]:  # Max 2 karakter
                if char.get('name'):
                    parts.append(f"{char['name']}")
                elif char.get('type') == 'female':
                    parts.append("a woman")
                elif char.get('type') == 'male':
                    parts.append("a man")
                elif char.get('type') == 'child':
                    parts.append("a child")
                elif char.get('type') == 'protagonist':
                    parts.append("the protagonist")

        if not parts:
            parts.append("a scene")

        return ", ".join(parts)

    @classmethod
    def _build_setting(cls, analysis: AnalysisResult) -> str:
        """Mekan/ortam oluştur"""
        setting_parts = []

        # Zaman
        time_map = {
            'morning': 'in the morning light',
            'afternoon': 'in afternoon sun',
            'evening': 'at golden hour sunset',
            'night': 'at night under moonlight',
            'dawn': 'at dawn first light',
            'dusk': 'at dusk twilight'
        }
        if analysis.time_setting:
            setting_parts.append(time_map.get(analysis.time_setting, ''))

        # Mekan
        location_map = {
            'indoor': 'inside a room',
            'outdoor_urban': 'in the city streets',
            'outdoor_nature': 'in nature landscape',
            'fantasy': 'in a magical realm',
            'historical': 'in ancient ruins'
        }
        if analysis.location_setting:
            if analysis.location_setting in location_map:
                setting_parts.append(location_map[analysis.location_setting])
            else:
                setting_parts.append(f"in {analysis.location_setting}")

        # Entity'lerden yer
        if analysis.entities.get('LOCATION'):
            setting_parts.append(f"at {analysis.entities['LOCATION'][0]}")

        return ", ".join(filter(None, setting_parts)) or "in a scene"

    @classmethod
    def _build_action(cls, analysis: AnalysisResult) -> str:
        """Aksiyon/hareket oluştur"""
        if not analysis.actions:
            return ""

        action_descriptions = []
        for action in analysis.actions[:2]:  # Max 2 aksiyon
            verb = action.get('verb', '')
            subject = action.get('subject', '')

            if verb:
                if action.get('is_passive'):
                    action_descriptions.append(f"being {verb}")
                elif action.get('is_negative'):
                    action_descriptions.append(f"not {verb}")
                else:
                    action_descriptions.append(verb)

        return ", ".join(action_descriptions)

    @classmethod
    def _build_atmosphere(cls, analysis: AnalysisResult) -> str:
        """Atmosfer oluştur"""
        parts = []

        # Mood
        mood_descriptions = {
            'joyful': 'joyful happy atmosphere',
            'melancholic': 'melancholic sad atmosphere',
            'tense': 'tense suspenseful atmosphere',
            'romantic': 'romantic dreamy atmosphere',
            'mysterious': 'mysterious enigmatic atmosphere',
            'epic': 'epic grand atmosphere',
            'peaceful': 'peaceful serene atmosphere',
            'dark': 'dark ominous atmosphere',
            'nostalgic': 'nostalgic wistful atmosphere',
            'surreal': 'surreal dreamlike atmosphere'
        }

        if analysis.mood in mood_descriptions:
            parts.append(mood_descriptions[analysis.mood])

        # Görsel elementler
        for elem in analysis.visual_elements[:3]:
            if elem.startswith('weather:'):
                parts.append(elem.split(':')[1])
            elif elem.startswith('lighting:'):
                parts.append(f"{elem.split(':')[1]} lighting")

        return ", ".join(parts)

    @classmethod
    def _build_technical(cls, analysis: AnalysisResult, style: str) -> str:
        """Teknik detaylar"""
        style_terms = {
            'cinematic': 'cinematic shot, film grain, anamorphic lens, movie still, 35mm film',
            'anime': 'anime style, studio ghibli inspired, vibrant anime colors, cel shaded',
            'digital': 'digital art, concept art, artstation trending, highly detailed illustration',
            'oil': 'oil painting, masterpiece, museum quality, classical art, brush strokes visible',
            'watercolor': 'watercolor painting, soft edges, delicate washes, artistic, wet on wet',
            'comic': 'comic book style, bold lines, dynamic composition, graphic novel art',
            'minimal': 'minimalist, clean lines, simple composition, negative space'
        }

        base = style_terms.get(style, 'highly detailed, professional quality')

        # Tema bazlı ek
        if analysis.themes:
            theme_style = cls.THEME_TO_STYLE.get(analysis.themes[0], '')
            if theme_style:
                base += f", {theme_style}"

        return base

    @classmethod
    def _build_faithful_prompt(cls, analysis: AnalysisResult) -> str:
        """Metne sadık prompt"""
        parts = []

        # Doğrudan metin öğeleri
        if analysis.characters:
            chars = [c.get('name') or c.get('type', 'person') for c in analysis.characters[:2]]
            parts.append(", ".join(chars))

        if analysis.location_setting:
            parts.append(f"in {analysis.location_setting}")

        if analysis.actions:
            parts.append(analysis.actions[0].get('verb', ''))

        parts.append(analysis.atmosphere.get('visual', ''))
        parts.append("highly detailed, photorealistic")

        return ", ".join(filter(None, parts))

    @classmethod
    def _build_creative_prompt(cls, analysis: AnalysisResult, style: str) -> str:
        """Artistik yaratıcı prompt"""
        parts = []

        # Stil bazlı başlangıç
        style_prefix = {
            'cinematic': 'cinematic masterpiece, award-winning cinematography',
            'anime': 'stunning anime artwork, studio quality animation',
            'digital': 'breathtaking digital art, trending on artstation',
            'oil': 'museum quality oil painting, renaissance masterpiece',
            'watercolor': 'ethereal watercolor artwork, delicate and expressive'
        }
        parts.append(style_prefix.get(style, 'stunning artwork'))

        # Mood yoğunluğuna göre
        if analysis.mood_intensity > 0.7:
            parts.append(f"intensely {analysis.mood}")
        elif analysis.mood_intensity > 0.4:
            parts.append(analysis.mood)

        # Tema
        if analysis.themes:
            parts.append(f"themes of {analysis.themes[0]}")

        # Işıklandırma
        parts.append(cls.MOOD_TO_LIGHTING.get(analysis.mood, ''))

        # Kalite
        parts.append("masterpiece, best quality, ultra detailed, 8k resolution")

        return ", ".join(filter(None, parts))

    @classmethod
    def _build_negative_prompt(cls, analysis: AnalysisResult, style: str) -> str:
        """Negatif prompt oluştur"""
        base_negative = [
            "low quality", "worst quality", "blurry", "pixelated",
            "bad anatomy", "bad hands", "extra fingers", "missing fingers",
            "deformed", "disfigured", "ugly", "duplicate",
            "watermark", "signature", "text", "logo"
        ]

        # Stil bazlı negatifler
        style_negatives = {
            'cinematic': ['cartoon', 'anime', 'illustration', 'painting'],
            'anime': ['photorealistic', 'photograph', '3d render', 'cgi'],
            'digital': ['photograph', 'film grain', 'noise'],
            'oil': ['digital art', 'smooth', 'photograph'],
            'watercolor': ['sharp edges', 'digital', 'photograph']
        }

        if style in style_negatives:
            base_negative.extend(style_negatives[style])

        # Mood bazlı negatifler
        mood_negatives = {
            'joyful': ['dark', 'gloomy', 'sad'],
            'dark': ['bright', 'cheerful', 'colorful'],
            'peaceful': ['chaotic', 'violent', 'disturbing'],
            'romantic': ['grotesque', 'horror', 'violent']
        }

        if analysis.mood in mood_negatives:
            base_negative.extend(mood_negatives[analysis.mood])

        return ", ".join(base_negative)

    @classmethod
    def _suggest_camera(cls, analysis: AnalysisResult) -> str:
        """Kamera açısı öner"""
        # Aksiyon yoğunluğuna göre
        action_count = len(analysis.actions)

        if action_count > 3:
            scene_type = 'action'
        elif action_count > 0:
            if any(a.get('is_passive') for a in analysis.actions):
                scene_type = 'emotion'
            else:
                scene_type = 'dialogue'
        elif analysis.location_setting:
            scene_type = 'description'
        elif analysis.mood in ['mysterious', 'dark']:
            scene_type = 'mystery'
        else:
            scene_type = 'description'

        cameras = cls.SCENE_TO_CAMERA.get(scene_type, ['medium shot'])
        return cameras[0]  # İlk önerileni döndür
