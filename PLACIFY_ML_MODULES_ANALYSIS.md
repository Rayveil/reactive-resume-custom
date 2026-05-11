# Placify AI-Powered Recruitment Platform - ML Modules Analysis

## Overview

Placify is an AI-powered recruitment and skill-assessment platform that automates resume screening, adaptive assessments, and personalized feedback. This document provides a comprehensive analysis of their ML modules architecture, focusing on resume-to-JD matching, skill gap analysis, and career path prediction.

**Repository**: MonishRaman/Placify-Smarter_Placements-Sharper_Talent  
**Source**: https://github.com/MonishRaman/Placify-Smarter_Placements-Sharper_Talent

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Resume-to-JD Matching Module](#resume-to-jd-matching-module)
3. [Match Score Calculation](#match-score-calculation)
4. [Skill Gap Analysis](#skill-gap-analysis)
5. [Improvement Suggestions (LLM-Based)](#improvement-suggestions-llm-based)
6. [Semantic Embeddings](#semantic-embeddings)
7. [Career Path Prediction](#career-path-prediction)
8. [Dependencies](#dependencies)
9. [Module Structure](#module-structure)
10. [Integration Examples](#integration-examples)

---

## Architecture Overview

### Directory Structure

```
ml_modules/
├── career_predictor/          # Career path & skill gap analysis
│   ├── career_graph.py        # Knowledge graph of roles/skills
│   ├── profile_vectorizer.py  # Profile embeddings
│   ├── skill_gap_analyzer.py  # Skill gap identification
│   ├── pathfinder.py          # Career path recommendation
│   ├── llm_integrator.py      # LLM-based recommendations
│   ├── main.py                # FastAPI endpoints
│   ├── requirements.txt
│   └── __init__.py
├── answer_accuracy/           # Interview response evaluation
│   ├── evaluate.py
│   └── keyword_checker.py
├── emotion_detector/          # Facial expression analysis
│   ├── model.py
│   ├── predict.py
│   └── utils.py
├── speech_analysis/           # Voice analysis
│   ├── audio_to_text.py
│   ├── sentiment_analyzer.py
│   └── prosody_metrics.py
├── main_analyzer.py           # Resume-Job matching engine
├── call_match.py              # CLI wrapper for matching
├── README.md
└── requirements.txt
```

### High-Level Data Flow

```
Resume Data + Job Description
           ↓
    [Vectorization]  ← SentenceTransformer (all-MiniLM-L6-v2)
           ↓
    [Cosine Similarity] ← Score calculation
           ↓
    [Skill Gap Analysis] ← Set operations on requirements
           ↓
    [LLM Integration] ← Generate recommendations
           ↓
    Match Score + Recommendations + Skill Gaps
```

---

## Resume-to-JD Matching Module

### File: `main_analyzer.py`

**Location**: `/ml_modules/main_analyzer.py`  
**Size**: 4.16 KB (89 lines)

### Key Function: `compute_resume_job_match_score()`

```python
def compute_resume_job_match_score(resume: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes similarity score between resume and job description using NLP embeddings.
    Returns match score, missing/weak skills, and feedback.
    """
```

#### Input Format

```python
# Resume Structure
resume = {
    "summary": str,
    "skills": [str],  # e.g., ["Python", "Django", "React"]
    "workExperience": [
        {
            "role": str,
            "company": str,
            "description": str
        }
    ],
    "projects": [
        {
            "title": str,
            "description": str
        }
    ],
    "education": [
        {
            "degree": str,
            "institution": str
        }
    ]
}

# Job Description Structure
job = {
    "title": str,  # e.g., "Senior Software Engineer"
    "domain": str,  # e.g., "Backend Development"
    "description": str,
    "requirements": [str],  # e.g., ["Python", "Docker", "Kubernetes"]
    "responsibilities": [str]
}
```

#### Output Format

```python
{
    "matchScore": int,           # 0-100, percentage match
    "missingSkills": [str],      # Skills required but not in resume
    "weakSkills": [str],         # Skills present but identified as weak
    "suggestions": [str],        # Actionable recommendations
    "feedback": str,             # Human-readable feedback
    "learningRecommendations": [str]  # Suggested learning modules
}
```

### Algorithm Steps

1. **Text Extraction**
   - Resume: Combines summary + skills + work experience + projects + education
   - Job: Combines title + domain + description + requirements + responsibilities

2. **Embedding Generation**
   - Uses SentenceTransformer model: `all-MiniLM-L6-v2`
   - Converts both resume and job text to 384-dimensional vectors

3. **Similarity Calculation**
   - Computes cosine similarity between vectors
   - Formula: `match_score = int(cosine_similarity * 100)`
   - Range: 0-100%

4. **Skill Gap Analysis**
   - Resume skills: `set([s.lower() for s in resume["skills"]])`
   - Job requirements: `set([r.lower() for r in job["requirements"]])`
   - Missing skills: `job_requirements - resume_skills`

5. **Suggestion Generation**
   - If missing_skills: "Add or improve these skills: {skills}"
   - If score < 70: "Consider taking recommended courses"
   - Always: "Optimize resume keywords for ATS compliance"

---

## Match Score Calculation

### Formula

```
Match Score = (Cosine Similarity Score) × 100

Where Cosine Similarity = (A · B) / (||A|| × ||B||)
- A = Resume embedding vector
- B = Job description embedding vector
- Result range: [0, 1] → [0, 100]
```

### Weighting Scheme

The system uses **implicit weighting** through the embedding model:

1. **SentenceTransformer Encoding**
   - Model: `all-MiniLM-L6-v2` (384 dimensions)
   - Handles semantic relationships automatically
   - No explicit weights; learned from training data

2. **Key Components Weighted**
   - Job title and domain (highest importance in job embedding)
   - Required skills (explicit list)
   - Description and responsibilities
   - Resume skills (explicit list)
   - Work experience (contains skill context)
   - Projects (demonstrates skill application)

### Skill Accuracy Score

```python
# Binary calculation for each skill
missing_skills = job_requirements - resume_skills
match_percentage = (len(resume_skills & job_requirements) / len(job_requirements)) * 100
```

---

## Skill Gap Analysis

### File: `skill_gap_analyzer.py`

**Location**: `/ml_modules/career_predictor/skill_gap_analyzer.py`  
**Size**: 1.03 KB (20 lines)

### Function Signature

```python
def get_skill_gap(current_role_skills: Set[str],
                  target_role_skills: Set[str],
                  student_skills: Set[str]) -> List[str]:
    """
    Calculates the skills a student needs to acquire to move from a
    current role to a target role.

    The gap includes:
    1. Skills from the target role the student doesn't have.
    2. Foundational skills from the current role the student is missing.

    Args:
        current_role_skills: Set of skills for current/entry-level role
        target_role_skills: Set of skills for target role
        student_skills: Set of skills the student currently has

    Returns:
        List of skills the student should learn
    """
```

### Algorithm

```python
# Step 1: Normalize all skills to lowercase
current_role_skills = {s.lower() for s in current_role_skills}
target_role_skills = {s.lower() for s in target_role_skills}
student_skills = {s.lower() for s in student_skills}

# Step 2: Calculate skill gap
# Target skills missing from student's profile
target_gap = target_role_skills - student_skills

# Step 3: Calculate foundational skill gap
# Current role skills missing from student's profile
foundational_gap = current_role_skills - student_skills

# Step 4: Combine and prioritize
skill_gap = foundational_gap.union(target_gap)
return sorted(list(skill_gap))
```

### Gap Identification Approach

1. **Two-Layer Gap Analysis**
   - Foundation Gap: Skills missing from current role
   - Target Gap: Skills missing from target role
   - Combined: Union of both gaps

2. **Skill Normalization**
   - Converts all skills to lowercase
   - Handles minor variations

3. **Set-Based Comparison**
   - Uses Python set operations
   - Efficient O(n) complexity
   - No fuzzy matching (exact match required)

### Example

```
Current Role Skills: {"Git", "Python", "Django", "SQL"}
Target Role Skills: {"Python", "Django", "Docker", "Kubernetes", "System Design"}
Student Skills: {"Python", "Git", "HTML", "CSS"}

Analysis:
- Foundation Gap: {"Django", "SQL"} - {"Python", "Git", "HTML", "CSS"} = {"Django", "SQL"}
- Target Gap: {"Docker", "Kubernetes", "System Design"} - {"Python", "Git", "HTML", "CSS"} = {"Docker", "Kubernetes", "System Design"}
- Total Gap: ["Django", "Docker", "Kubernetes", "SQL", "System Design"]
```

---

## Improvement Suggestions (LLM-Based)

### File: `llm_integrator.py`

**Location**: `/ml_modules/career_predictor/llm_integrator.py`  
**Size**: 4.23 KB (90 lines)

### LLM Integration

```python
class LLMIntegrator:
    def __init__(self):
        """
        Initializes LLM with Google Gemini API.
        Uses models/gemini-1.5-pro by default.
        """
```

### Function: `generate_recommendation()`

```python
def generate_recommendation(self, target_role: str, skill_gap: List[str]) -> str:
    """
    Generates a personalized learning plan using the LLM.

    Args:
        target_role: Target job title (e.g., "Senior Backend Developer")
        skill_gap: List of skills to acquire

    Returns:
        Formatted markdown with 3 parts:
        1. Narrative - Why skills are important
        2. Project Ideas - Hands-on learning projects
        3. Key Resources - Recommended learning materials
    """
```

### Prompt Structure

```python
prompt = f"""
Act as an expert career coach in the software industry.

A student is trying to move into a '{target_role}' role and has the
following skill gaps: {skills_str}.

Please provide a concise, actionable recommendation in 3 parts:

1. **Narrative:** A brief, encouraging paragraph (2-3 sentences)
   explaining why these skills are important for the '{target_role}' role.

2. **Project Ideas:** 1-2 small project ideas that would help them
   learn and demonstrate these skills.

3. **Key Resources:** 1-2 high-quality online resources
   (e.g., documentation, tutorial, platform) to learn these skills.

Format the response clearly in markdown.
"""
```

### LLM Configuration

```python
generation_config = {
    "temperature": 0.7,      # Balance between creativity and consistency
    "top_p": 0.95,           # Nucleus sampling
    "top_k": 40,             # Top-k sampling
    "max_output_tokens": 1024  # Maximum response length
}

safety_settings = [
    # Set to BLOCK_NONE for testing (should be adjusted for production)
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
]
```

### Example Output

```
**Narrative:**
Python and Django are foundational skills for backend development and are highly sought
after in the industry. Docker and Kubernetes enable you to deploy and manage applications
at scale, making you a much more valuable Backend Developer.

**Project Ideas:**
1. Build a multi-container Django application with PostgreSQL using Docker Compose
2. Deploy a Django app to Kubernetes using Minikube locally

**Key Resources:**
1. Django Documentation: https://docs.djangoproject.com/
2. Docker Official Documentation: https://docs.docker.com/
```

---

## Semantic Embeddings

### File: `profile_vectorizer.py`

**Location**: `/ml_modules/career_predictor/profile_vectorizer.py`  
**Size**: 1.59 KB (37 lines)

### Embedding Model

```python
class Vectorizer:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initializes the vectorizer with SentenceTransformer model.

        Model: all-MiniLM-L6-v2
        - Dimensions: 384
        - Speed: Very fast
        - Quality: Good for semantic similarity
        - Parameters: 22M
        """
        self.model = SentenceTransformer(model_name)
```

### Functions

#### 1. Vectorize Resume Profile

```python
def vectorize_profile(self, resume_text: str, skill_tags: List[str]) -> np.ndarray:
    """
    Combines resume text and skill tags into a single string and
    computes its vector embedding.

    Args:
        resume_text: Full resume content
        skill_tags: List of skills ["Python", "Django", ...]

    Returns:
        384-dimensional numpy array representing the profile
    """
    skills_str = " ".join(skill_tags)
    combined_text = f"SKILLS: {skills_str}. RESUME: {resume_text}"
    vector = self.model.encode(combined_text, convert_to_numpy=True)
    return vector
```

#### 2. Vectorize Job Role

```python
def vectorize_job_role(self, job_title: str, core_skills: List[str]) -> np.ndarray:
    """
    Creates a vector representation for a job role.

    Args:
        job_title: Job title (e.g., "Senior Backend Developer")
        core_skills: List of required skills

    Returns:
        384-dimensional numpy array representing the job role
    """
    skills_str = " ".join(core_skills)
    combined_text = f"Job Title: {job_title}. Core Skills: {skills_str}."
    vector = self.model.encode(combined_text, convert_to_numpy=True)
    return vector
```

### Model Specification

- **Model Name**: `all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Architecture**: Distilled BERT-based
- **Training Data**: NLI (Natural Language Inference) + STSb (Semantic Textual Similarity)
- **Fallback Logic**: None explicitly defined; raises exception if model fails to load
- **Similarity Metric**: Cosine similarity

### Vector Computation Process

```
Resume Input: "Software Engineer with 3 years Python/Django experience"
            + Skills: ["Python", "Django", "React", "PostgreSQL"]
            ↓
Combined Text: "SKILLS: Python Django React PostgreSQL.
                RESUME: Software Engineer with 3 years Python/Django experience"
            ↓
SentenceTransformer.encode() → 384-dim vector
            ↓
Normalized L2-norm vector for cosine similarity calculation
```

---

## Career Path Prediction

### File: `pathfinder.py`

**Location**: `/ml_modules/career_predictor/pathfinder.py`  
**Size**: 4.32 KB (88 lines)

### Class: `Pathfinder`

```python
class Pathfinder:
    def __init__(self, career_graph: CareerGraph,
                 vectorizer: Vectorizer,
                 llm: LLMIntegrator):
        """
        Orchestrates career path prediction.

        Components:
        1. Career graph with roles and skill requirements
        2. Vectorizer for profile matching
        3. LLM for generating personalized recommendations
        """
```

### Main Function: `find_career_paths()`

```python
def find_career_paths(self,
                     student_profile: Dict[str, Any],
                     num_paths: int = 2) -> List[Dict[str, Any]]:
    """
    Main logic to generate career path recommendations.

    Algorithm:
    1. Vectorize student profile (resume + skills)
    2. Find closest starting role using cosine similarity
    3. Identify possible next steps (successor roles in graph)
    4. Calculate skill gap for each next step
    5. Sort by skill gap (lowest first)
    6. Generate LLM recommendations for top N paths

    Args:
        student_profile: {
            "resume_text": str,
            "skills": [str]
        }
        num_paths: Number of career paths to recommend (default: 2)

    Returns:
        List of career paths:
        [
            {
                "path": ["Current Role", "Target Role"],
                "skill_gap": ["skill1", "skill2", ...],
                "recommendation_text": "LLM-generated advice..."
            },
            ...
        ]
    """
```

### Algorithm Steps

#### Step 1: Vectorize Student Profile

```python
student_vector = self.vectorizer.vectorize_profile(
    resume_text=student_profile["resume_text"],
    skill_tags=list(student_skills)
)
# Output: 384-dimensional vector
```

#### Step 2: Find Closest Starting Role

```python
def _find_closest_start_node(self, student_vector: np.ndarray) -> str:
    """
    Uses cosine similarity to find the best-matching role in the graph.

    Process:
    1. Pre-compute vectors for all roles in the career graph
    2. Calculate cosine similarity between student vector and each role
    3. Return role with highest similarity

    Similarity = (A · B) / (||A|| × ||B||)
    """
    similarities = cosine_similarity(student_vector_2d, role_vectors)
    closest_role_index = np.argmax(similarities)
    return roles[closest_role_index]
```

#### Step 3: Identify Next Steps

```python
# Get all successor roles in the career graph
possible_next_steps = list(self.graph.successors(start_node))

# Example graph transitions:
# "Junior Frontend Developer" → "Senior Frontend Developer"
# "Junior Frontend Developer" → NOT "Backend Developer" (disconnected)
```

#### Step 4: Calculate Skill Gap

```python
for target_node in possible_next_steps:
    current_role_skills = self.graph.nodes[start_node]['skills']
    target_role_skills = self.graph.nodes[target_node]['skills']

    skill_gap = get_skill_gap(
        current_role_skills,
        target_role_skills,
        student_skills
    )
    cost = len(skill_gap)  # Cost is the size of the gap
```

#### Step 5: Sort and Filter

```python
# Sort by skill gap (lowest first - easier transitions)
sorted_steps = sorted(scored_steps, key=lambda x: x['cost'])

# Take top N paths
top_steps = sorted_steps[:num_paths]
```

#### Step 6: Generate Recommendations

```python
# Use LLM to create personalized learning plan
recommendation_text = self.llm.generate_recommendation(
    target_role=step['target'],
    skill_gap_list=step['skill_gap']
)
```

### Career Graph Structure

#### File: `career_graph.py`

```python
class CareerGraph:
    def _initialize_graph(self):
        """
        Creates a directed graph (DAG) with:
        - Nodes: Job roles (Junior Frontend, Senior Frontend, Tech Lead, etc.)
        - Node attributes: skills required for each role
        - Edges: Possible career transitions
        """
```

#### Defined Roles and Skills

**Frontend Track**

```
Skills: HTML, CSS, JavaScript, React, Git, TypeScript, State Management, Testing, Webpack
Progression:
  Software Engineer Intern
    ↓
  Graduate Software Engineer
    ↓
  Junior Frontend Developer → Senior Frontend Developer → Tech Lead
```

**Backend Track**

```
Skills: Python, Flask/Django, SQL, REST APIs, Docker, Kubernetes, Microservices, System Design
Progression:
  Junior Backend Developer → Senior Backend Developer → Tech Lead
```

**Data Track**

```
Skills: SQL, Excel, Tableau/PowerBI, Python (Pandas), Statistics, ML, Scikit-learn, TensorFlow, Big Data
Progression:
  Junior Data Analyst → Data Scientist
```

**DevOps/SRE Track**

```
Skills: Linux, Bash, Docker, Kubernetes, CI/CD, Terraform, Monitoring
Progression:
  DevOps Engineer → Site Reliability Engineer (SRE)
```

**Cross-Functional Moves**

```
Senior Frontend Developer → Product Manager
Senior Backend Developer → Product Manager
```

#### Example Graph Structure

```python
# Nodes with skills
self.graph.add_node("Junior Backend Developer",
    skills={"Python", "Flask/Django", "SQL", "REST APIs", "Git"})

# Edges (transitions)
self.graph.add_edges_from([
    ("Software Engineer Intern", "Junior Backend Developer"),
    ("Junior Backend Developer", "Senior Backend Developer"),
    ("Senior Backend Developer", "Tech Lead"),
    ("Junior Backend Developer", "DevOps Engineer"),
])
```

---

## Dependencies

### Core ML Dependencies

```
fastapi          # Web framework
uvicorn[standard] # ASGI server
networkx         # Graph data structure for career paths
sentence-transformers  # Semantic embeddings (all-MiniLM-L6-v2)
scikit-learn     # ML utilities (cosine_similarity)
google-generativeai # Gemini LLM integration
pydantic         # Data validation
python-dotenv    # Environment variable management
```

### Interview Evaluation Modules

```
- OpenCV or PIL: Image processing
- LibROSA: Audio processing
- TensorFlow/PyTorch: Deep learning models
- NLTK/spaCy: NLP
- Librosa: Speech analysis
```

### Optional Dependencies (in main ml_modules)

```
- Black: Code formatting
- Flake8: Linting
```

---

## Module Structure

### 1. Main Resume-Job Matching Module

**File**: `ml_modules/main_analyzer.py`

**Entry Point**: `analyze_resume_job_match(resume, job)`

**Returns**:

```python
{
    "matchScore": int (0-100),
    "missingSkills": [str],
    "weakSkills": [str],
    "suggestions": [str],
    "feedback": str,
    "learningRecommendations": [str]
}
```

**Usage**:

```python
from ml_modules.main_analyzer import analyze_resume_job_match

result = analyze_resume_job_match(
    resume={
        "summary": "...",
        "skills": ["Python", "Django"],
        "workExperience": [...],
        "projects": [...],
        "education": [...]
    },
    job={
        "title": "Senior Backend Developer",
        "requirements": ["Python", "Docker", "Kubernetes"],
        "responsibilities": [...]
    }
)

print(f"Match Score: {result['matchScore']}%")
print(f"Missing Skills: {result['missingSkills']}")
```

### 2. Career Predictor Module

**Files**: `ml_modules/career_predictor/`

**Entry Point**: `main.py` - FastAPI endpoint

**Endpoint**: `POST /predict-career-path`

**Request**:

```python
{
    "student_id": "student123"
}
```

**Response**:

```python
{
    "student_id": "student123",
    "predicted_current_role": "Junior Backend Developer",
    "potential_paths": [
        {
            "path": ["Junior Backend Developer", "Senior Backend Developer"],
            "skill_gap": ["Docker", "Kubernetes", "System Design"],
            "recommendation_text": "..."
        },
        ...
    ]
}
```

**Usage**:

```python
from ml_modules.career_predictor.career_graph import CareerGraph
from ml_modules.career_predictor.profile_vectorizer import Vectorizer
from ml_modules.career_predictor.pathfinder import Pathfinder
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

# Initialize components
graph = CareerGraph()
vectorizer = Vectorizer(model_name='all-MiniLM-L6-v2')
llm = LLMIntegrator()

# Create pathfinder
pathfinder = Pathfinder(graph, vectorizer, llm)

# Get recommendations
student_profile = {
    "resume_text": "3 years Python/Django backend development experience",
    "skills": ["Python", "Django", "SQL", "Git"]
}

paths = pathfinder.find_career_paths(student_profile, num_paths=2)
```

### 3. Interview Evaluation Module

**Files**: `ml_modules/emotion_detector/`, `ml_modules/speech_analysis/`, `ml_modules/answer_accuracy/`

**Entry Point**: `main_analyzer.py` (in ml_modules root)

**Usage**:

```python
from ml_modules.main_analyzer import generate_analysis_report

report = generate_analysis_report(
    audio_path="interview_audio.wav",
    user_answer="I have 3 years of Python experience...",
    ideal_answer="Candidate should demonstrate strong Python knowledge...",
    keywords=["python", "django", "api"],
    image_path="candidate_photo.jpg"  # Optional
)

print(f"Overall Score: {report['overall_score']}/100")
print(f"Recommendations: {report['recommendations']}")
```

---

## Integration Examples

### Example 1: Simple Resume-Job Match

```python
from ml_modules.main_analyzer import analyze_resume_job_match

resume = {
    "summary": "Software engineer with 5 years experience",
    "skills": ["Python", "Django", "React", "PostgreSQL"],
    "workExperience": [
        {
            "role": "Backend Developer",
            "company": "TechCorp",
            "description": "Built REST APIs with Django"
        }
    ],
    "projects": [
        {
            "title": "E-commerce Platform",
            "description": "Built full-stack app with Django and React"
        }
    ],
    "education": [
        {
            "degree": "B.S. Computer Science",
            "institution": "State University"
        }
    ]
}

job = {
    "title": "Senior Backend Engineer",
    "domain": "Backend Development",
    "description": "We are looking for a Senior Backend Engineer...",
    "requirements": ["Python", "Django", "Docker", "Kubernetes", "AWS"],
    "responsibilities": ["Design and implement backend systems", ...]
}

result = analyze_resume_job_match(resume, job)

print(f"""
Match Analysis:
- Match Score: {result['matchScore']}%
- Missing Skills: {', '.join(result['missingSkills'])}
- Feedback: {result['feedback']}
- Suggestions:
  {chr(10).join('  - ' + s for s in result['suggestions'])}
""")
```

### Example 2: Career Path Prediction with Recommendations

```python
from ml_modules.career_predictor.career_graph import CareerGraph
from ml_modules.career_predictor.profile_vectorizer import Vectorizer
from ml_modules.career_predictor.pathfinder import Pathfinder
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

# Initialize
graph = CareerGraph()
vectorizer = Vectorizer()
llm = LLMIntegrator()
pathfinder = Pathfinder(graph, vectorizer, llm)

# Student profile
student = {
    "resume_text": """
        Final year CS student with internship experience.
        Built projects with Python and web technologies.
        Interested in backend development.
    """,
    "skills": ["Python", "Django", "SQL", "Git", "JavaScript"]
}

# Get recommendations
paths = pathfinder.find_career_paths(student, num_paths=3)

for i, path in enumerate(paths, 1):
    print(f"\nCareer Path {i}:")
    print(f"  Current → Target: {' → '.join(path['path'])}")
    print(f"  Skill Gap: {', '.join(path['skill_gap'])}")
    print(f"  AI Recommendation:\n{path['recommendation_text']}")
```

### Example 3: Batch Processing

```python
from ml_modules.main_analyzer import analyze_resume_job_match

resumes = [...]  # List of 100 resumes
job_posting = {...}  # Single job

results = []
for resume in resumes:
    match_result = analyze_resume_job_match(resume, job_posting)
    results.append({
        "candidate_id": resume["id"],
        "match_score": match_result["matchScore"],
        "match_result": match_result
    })

# Sort by match score
results.sort(key=lambda x: x["match_score"], reverse=True)

# Get top 10 candidates
top_candidates = results[:10]
```

---

## Key Algorithm Parameters

### Resume-Job Matching

- **Model**: SentenceTransformer all-MiniLM-L6-v2
- **Vector Dimension**: 384
- **Similarity Metric**: Cosine similarity
- **Match Score Range**: 0-100%
- **Processing**: O(n) for n skills

### Career Path Prediction

- **Graph Type**: Directed Acyclic Graph (DAG)
- **Number of Roles**: 10+ predefined roles
- **Similarity Metric**: Cosine similarity
- **Path Sorting**: By skill gap size (lowest first)
- **Top Recommendations**: Top N paths (default: 2)

### Skill Gap Analysis

- **Algorithm**: Set difference operations
- **Time Complexity**: O(n) where n = number of skills
- **Normalization**: Lowercase conversion
- **Matching**: Exact string matching (no fuzzy)

### LLM Recommendations

- **Model**: Google Gemini 1.5 Pro
- **Temperature**: 0.7 (balanced)
- **Max Tokens**: 1024
- **Response Format**: Markdown with 3 sections

---

## Implementation Considerations for HRAgent

### 1. Data Flow

```
Candidate Profile (Resume + Skills + Assessments)
          ↓
Resume-to-JD Matching (main_analyzer.py)
          ↓
Match Score + Skill Gaps
          ↓
Career Path Prediction (pathfinder.py)
          ↓
Personalized Learning Plan (llm_integrator.py)
          ↓
Actionable Recommendations
```

### 2. Key Components to Replicate

- **SentenceTransformer**: For semantic similarity (no ML training needed)
- **NetworkX Graph**: For role hierarchies and transitions
- **Set Operations**: For skill gap identification
- **LLM Integration**: For personalized recommendations
- **Cosine Similarity**: For matching and scoring

### 3. Performance Notes

- **Vectorization**: Fast (< 100ms per resume with GPU)
- **Similarity Calculation**: Very fast (< 10ms)
- **Skill Gap**: Instant (set operations)
- **LLM Generation**: 1-5 seconds (network-dependent)
- **Batch Processing**: Linear with number of resumes

### 4. Scalability Recommendations

- Cache pre-computed role vectors (stored in Pathfinder)
- Batch LLM requests for efficiency
- Use vector similarity indexes for large datasets
- Consider GPU acceleration for large-scale vectorization

### 5. Accuracy Improvements

- Fine-tune SentenceTransformer on domain-specific data
- Expand career graph with more roles and transitions
- Use fuzzy matching for skill variations
- Implement skill synonym mapping
- Add experience level weighting

---

## References

- **Repository**: https://github.com/MonishRaman/Placify-Smarter_Placements-Sharper_Talent
- **SentenceTransformer**: https://www.sbert.net/
- **NetworkX**: https://networkx.org/
- **Google Gemini API**: https://ai.google.dev/
- **Scikit-learn**: https://scikit-learn.org/

---

_Analysis Date: May 2026_
_Source: Placify GitHub Repository - ml_modules Folder_
