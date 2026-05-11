# Placify ML Modules - Quick Reference & Code Examples

## Quick Function Reference

### 1. Resume-to-JD Matching

**Location**: `main_analyzer.py`

```python
from ml_modules.main_analyzer import analyze_resume_job_match, compute_resume_job_match_score

# Direct usage
result = analyze_resume_job_match(resume_dict, job_dict)

# Output structure
{
    "matchScore": 78,                                    # 0-100%
    "missingSkills": ["Docker", "Kubernetes"],         # Required but missing
    "weakSkills": ["DevOps", "Microservices"],          # Present but weak
    "suggestions": [                                     # Actionable items
        "Add or improve these skills: Docker, Kubernetes",
        "Consider taking recommended courses...",
        "Optimize resume keywords..."
    ],
    "feedback": "Your resume matches 78% with the job...",
    "learningRecommendations": [
        "Take a Docker assessment...",
        "Take a Kubernetes assessment..."
    ]
}
```

### 2. Skill Gap Analysis

**Location**: `career_predictor/skill_gap_analyzer.py`

```python
from ml_modules.career_predictor.skill_gap_analyzer import get_skill_gap

# Inputs
current_role_skills = {"Python", "Git", "Django", "SQL"}
target_role_skills = {"Python", "Django", "Docker", "Kubernetes", "System Design"}
student_skills = {"Python", "Git", "HTML", "CSS"}

# Analysis
gaps = get_skill_gap(current_role_skills, target_role_skills, student_skills)
# Output: ["Django", "SQL", "Docker", "Kubernetes", "System Design"]

# Interpretation
print(f"Foundation gaps: {current_role_skills - student_skills}")
# Output: Foundation gaps: {'Django', 'SQL'}

print(f"Target gaps: {target_role_skills - student_skills}")
# Output: Target gaps: {'Docker', 'Kubernetes', 'System Design'}
```

### 3. Profile Vectorization

**Location**: `career_predictor/profile_vectorizer.py`

```python
from ml_modules.career_predictor.profile_vectorizer import Vectorizer
import numpy as np

# Initialize (downloads model on first use)
vectorizer = Vectorizer(model_name='all-MiniLM-L6-v2')  # 384-dim vectors

# Vectorize resume
resume_vector = vectorizer.vectorize_profile(
    resume_text="5 years Python/Django backend development",
    skill_tags=["Python", "Django", "PostgreSQL", "Docker"]
)
# Output: numpy array of shape (384,)

# Vectorize job role
job_vector = vectorizer.vectorize_job_role(
    job_title="Senior Backend Developer",
    core_skills=["Python", "Django", "Docker", "Kubernetes"]
)
# Output: numpy array of shape (384,)

# Calculate similarity
from sklearn.metrics.pairwise import cosine_similarity
similarity = cosine_similarity(
    resume_vector.reshape(1, -1),
    job_vector.reshape(1, -1)
)[0][0]
print(f"Similarity: {similarity:.2f} (0-1 scale)")  # e.g., 0.85
```

### 4. Career Path Prediction

**Location**: `career_predictor/pathfinder.py`

```python
from ml_modules.career_predictor.career_graph import CareerGraph
from ml_modules.career_predictor.profile_vectorizer import Vectorizer
from ml_modules.career_predictor.pathfinder import Pathfinder
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

# Initialize (one-time setup)
career_graph = CareerGraph()
vectorizer = Vectorizer()
llm = LLMIntegrator()
pathfinder = Pathfinder(career_graph, vectorizer, llm)

# Student profile
student_profile = {
    "resume_text": "CS graduate with Python/Django internship experience",
    "skills": ["Python", "Django", "SQL", "Git"]
}

# Get career paths
recommendations = pathfinder.find_career_paths(
    student_profile=student_profile,
    num_paths=2  # Top 2 recommendations
)

# Output structure
[
    {
        "path": ["Graduate Software Engineer", "Junior Backend Developer"],
        "skill_gap": ["REST APIs", "Microservices"],
        "recommendation_text": "## Narrative\n...\n## Project Ideas\n...\n## Resources\n..."
    },
    {
        "path": ["Graduate Software Engineer", "Junior Frontend Developer"],
        "skill_gap": ["React", "CSS", "TypeScript"],
        "recommendation_text": "..."
    }
]
```

### 5. LLM Recommendations

**Location**: `career_predictor/llm_integrator.py`

```python
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

# Initialize (requires GEMINI_API_KEY env var)
llm = LLMIntegrator()

# Generate recommendation
recommendation = llm.generate_recommendation(
    target_role="Senior Backend Developer",
    skill_gap=["Docker", "Kubernetes", "System Design"]
)

# Output (markdown format)
"""
## Narrative
Docker and Kubernetes are critical for modern backend development...

## Project Ideas
1. Build a multi-container application with Docker Compose
2. Deploy a microservice to Kubernetes using Minikube

## Key Resources
1. Docker Official Tutorial: https://docs.docker.com/get-started/
2. Kubernetes Documentation: https://kubernetes.io/docs/
"""
```

---

## Complete Integration Examples

### Example 1: End-to-End Resume Screening Pipeline

```python
"""
Scenario: Screen 1000 resumes for a Senior Backend Developer position
"""

from ml_modules.main_analyzer import analyze_resume_job_match

# Job specification
target_job = {
    "title": "Senior Backend Developer",
    "domain": "Backend Development",
    "description": "Lead backend development for cloud-native applications",
    "requirements": [
        "Python", "Django", "Docker", "Kubernetes",
        "PostgreSQL", "REST APIs", "Microservices",
        "System Design", "AWS"
    ],
    "responsibilities": [
        "Design and implement scalable backend systems",
        "Lead code reviews and mentor junior developers",
        "Optimize database performance"
    ]
}

# Process all resumes
results = []
for i, resume in enumerate(resumes):
    try:
        match_result = analyze_resume_job_match(resume, target_job)
        results.append({
            "candidate_id": resume.get("id", f"candidate_{i}"),
            "name": resume.get("name"),
            "match_score": match_result["matchScore"],
            "match_data": match_result
        })
    except Exception as e:
        print(f"Error processing resume {i}: {e}")

# Sort and filter
results.sort(key=lambda x: x["match_score"], reverse=True)
top_candidates = results[:50]  # Top 50

# Generate report
print("Top 10 Candidates:")
for rank, candidate in enumerate(top_candidates[:10], 1):
    result = candidate["match_data"]
    print(f"""
{rank}. {candidate['name']} (ID: {candidate['candidate_id']})
   Match Score: {result['matchScore']}%
   Missing Skills: {', '.join(result['missingSkills'])}
   Suggestions:
     {chr(10).join('     - ' + s for s in result['suggestions'][:2])}
""")
```

### Example 2: Career Guidance System

```python
"""
Scenario: Provide personalized career guidance to students
"""

from ml_modules.career_predictor.career_graph import CareerGraph
from ml_modules.career_predictor.profile_vectorizer import Vectorizer
from ml_modules.career_predictor.pathfinder import Pathfinder
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

# Initialize components
graph = CareerGraph()
vectorizer = Vectorizer()
llm = LLMIntegrator()
pathfinder = Pathfinder(graph, vectorizer, llm)

# Student data
student_profiles = [
    {
        "id": "student_001",
        "resume_text": "Recent grad with Python/Django internship",
        "skills": ["Python", "Django", "SQL", "Git"]
    },
    {
        "id": "student_002",
        "resume_text": "2 years frontend development with React",
        "skills": ["JavaScript", "React", "CSS", "Git", "TypeScript"]
    },
    {
        "id": "student_003",
        "resume_text": "Data analyst with SQL and Python",
        "skills": ["Python", "SQL", "Excel", "Tableau"]
    }
]

# Generate guidance for each student
career_guidance = {}
for student in student_profiles:
    print(f"\nAnalyzing {student['id']}...")

    # Get career paths
    paths = pathfinder.find_career_paths(
        student_profile={
            "resume_text": student["resume_text"],
            "skills": student["skills"]
        },
        num_paths=3
    )

    career_guidance[student["id"]] = {
        "current_profile": student,
        "recommended_paths": paths
    }

    # Display results
    if paths:
        print(f"Recommended current role: {paths[0]['path'][0]}")
        print(f"Top career paths:")
        for i, path in enumerate(paths, 1):
            print(f"\n  Path {i}: {' → '.join(path['path'])}")
            print(f"  Skills to develop: {', '.join(path['skill_gap'][:5])}")
```

### Example 3: Hybrid Matching with Career Planning

```python
"""
Scenario: Find best job matches AND plan career development
"""

from ml_modules.main_analyzer import analyze_resume_job_match
from ml_modules.career_predictor.skill_gap_analyzer import get_skill_gap

# Candidate profile
candidate = {
    "id": "cand_123",
    "name": "Alice Johnson",
    "resume": {
        "summary": "3 years Python backend development",
        "skills": ["Python", "Django", "PostgreSQL", "Git"],
        "workExperience": [
            {
                "role": "Backend Developer",
                "company": "StartupXYZ",
                "description": "Built REST APIs with Django and PostgreSQL"
            }
        ]
    }
}

# Available job positions
job_positions = [
    {
        "id": "job_1",
        "title": "Senior Backend Developer",
        "requirements": ["Python", "Django", "Docker", "Kubernetes", "AWS"]
    },
    {
        "id": "job_2",
        "title": "Full Stack Developer",
        "requirements": ["Python", "JavaScript", "React", "PostgreSQL", "Docker"]
    },
    {
        "id": "job_3",
        "title": "DevOps Engineer",
        "requirements": ["Python", "Docker", "Kubernetes", "Terraform", "CI/CD"]
    }
]

# Match jobs and plan development
recommendations = []

for job in job_positions:
    # Calculate match
    match_result = analyze_resume_job_match(candidate["resume"], job)

    # Analyze gaps
    gaps = match_result["missingSkills"]

    # Prioritize by gap size (fewer missing skills = easier transition)
    difficulty = len(gaps)

    recommendations.append({
        "job_id": job["id"],
        "job_title": job["title"],
        "match_score": match_result["matchScore"],
        "difficulty_level": "Easy" if difficulty <= 1 else "Medium" if difficulty <= 3 else "Hard",
        "missing_skills": gaps,
        "current_skills": set(candidate["resume"]["skills"]),
        "required_skills": set(job["requirements"])
    })

# Sort by match score
recommendations.sort(key=lambda x: x["match_score"], reverse=True)

# Display ranked opportunities
print(f"Job Opportunities for {candidate['name']}:\n")
for rank, rec in enumerate(recommendations, 1):
    print(f"{rank}. {rec['job_title']}")
    print(f"   Match Score: {rec['match_score']}%")
    print(f"   Difficulty: {rec['difficulty_level']}")
    print(f"   Missing Skills to Learn: {', '.join(rec['missing_skills'])}")

    # Skill progression path
    skill_overlap = rec['current_skills'] & rec['required_skills']
    print(f"   Existing Relevant Skills: {', '.join(skill_overlap)}")
    print()
```

---

## Performance Optimization Tips

### 1. Batch Processing

```python
# Instead of processing one resume at a time:
from ml_modules.main_analyzer import analyze_resume_job_match
from concurrent.futures import ThreadPoolExecutor, as_completed

def process_resume_batch(resumes, job, max_workers=4):
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(analyze_resume_job_match, r, job): r
            for r in resumes
        }
        for future in as_completed(futures):
            results.append(future.result())
    return results
```

### 2. Caching Role Vectors

```python
# Pathfinder already caches role vectors:
pathfinder = Pathfinder(graph, vectorizer, llm)
# role_vectors are pre-computed in __init__ → O(1) lookup per role

# For repeated resume matching, cache resume vectors:
resume_vector_cache = {}
for resume_id, resume in resumes.items():
    resume_text = extract_resume_text(resume)
    skills = resume["skills"]
    vector = vectorizer.vectorize_profile(resume_text, skills)
    resume_vector_cache[resume_id] = vector
```

### 3. Filtering Before LLM Calls

```python
# Only call expensive LLM for top candidates
from ml_modules.main_analyzer import analyze_resume_job_match
from ml_modules.career_predictor.llm_integrator import LLMIntegrator

matches = []
for resume in resumes:
    result = analyze_resume_job_match(resume, job)
    matches.append((resume, result))

# Sort and filter
matches.sort(key=lambda x: x[1]["matchScore"], reverse=True)
top_100 = matches[:100]

# Only generate LLM recommendations for top candidates
llm = LLMIntegrator()
for resume, match_result in top_100:
    recommendation = llm.generate_recommendation(
        target_role=job["title"],
        skill_gap=match_result["missingSkills"]
    )
```

---

## Configuration & Setup

### Environment Variables

```bash
# .env file for career_predictor
GEMINI_API_KEY=your_api_key_here
```

### Python Environment

```bash
cd ml_modules
pip install -r requirements.txt

# Or specific to career_predictor:
cd career_predictor
pip install -r requirements.txt
```

### Model Download

```python
# Models are auto-downloaded on first use
from sentence_transformers import SentenceTransformer

# Downloads ~60MB model to ~/.cache/huggingface/
model = SentenceTransformer('all-MiniLM-L6-v2')
```

---

## Common Patterns

### Pattern 1: Filter-Score-Rank

```python
# 1. Filter: Quick check (binary match)
matches = [r for r in resumes if "Python" in r["skills"]]

# 2. Score: Calculate match scores
scored = [
    (r, analyze_resume_job_match(r, job))
    for r in matches
]

# 3. Rank: Sort by score
ranked = sorted(scored, key=lambda x: x[1]["matchScore"], reverse=True)

# 4. Action: Take top N
top_candidates = ranked[:10]
```

### Pattern 2: Match-Gap-Plan

```python
# 1. Match: Calculate similarity
match_result = analyze_resume_job_match(resume, job)

# 2. Gap: Identify skill gaps
gaps = match_result["missingSkills"]

# 3. Plan: Generate learning plan
recommendation = llm.generate_recommendation(
    target_role=job["title"],
    skill_gap=gaps
)
```

### Pattern 3: Current-to-Target

```python
# 1. Identify current role (via vectorization)
current_role = pathfinder._find_closest_start_node(student_vector)

# 2. Get target roles (successors in graph)
target_roles = list(graph.graph.successors(current_role))

# 3. Calculate gaps for each
gaps_by_target = {}
for target in target_roles:
    gap = get_skill_gap(
        current_role_skills,
        target_role_skills,
        student_skills
    )
    gaps_by_target[target] = gap
```

---

## Troubleshooting

### Issue: Model download fails

```python
# Solution: Set cache directory
import os
os.environ['HF_HOME'] = '/path/to/cache'

from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
```

### Issue: LLM API key not found

```python
# Solution: Set in environment or code
import os
from dotenv import load_dotenv

load_dotenv()  # Loads from .env
# Or manually set:
os.environ['GEMINI_API_KEY'] = 'your_key'

from ml_modules.career_predictor.llm_integrator import LLMIntegrator
llm = LLMIntegrator()
```

### Issue: Slow vectorization

```python
# Solution: Use GPU if available
from sentence_transformers import SentenceTransformer
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = SentenceTransformer('all-MiniLM-L6-v2', device=device)
```

---

## API Response Examples

### Resume-Job Match Response

```json
{
  "matchScore": 75,
  "missingSkills": ["Docker", "Kubernetes", "AWS"],
  "weakSkills": ["System Design", "Microservices"],
  "suggestions": [
    "Add or improve these skills: Docker, Kubernetes, AWS",
    "Consider taking recommended courses or assessments to boost your profile.",
    "Optimize resume keywords and structure for ATS compliance."
  ],
  "feedback": "Your resume matches 75% with the job description.",
  "learningRecommendations": [
    "Take a Docker assessment or course to improve your chances.",
    "Take a Kubernetes assessment or course to improve your chances.",
    "Take a AWS assessment or course to improve your chances."
  ]
}
```

### Career Path Prediction Response

```json
{
  "student_id": "student_123",
  "predicted_current_role": "Junior Backend Developer",
  "potential_paths": [
    {
      "path": ["Junior Backend Developer", "Senior Backend Developer"],
      "skill_gap": ["Docker", "Kubernetes", "System Design"],
      "recommendation_text": "## Narrative\nKubernetes and Docker are..."
    },
    {
      "path": ["Junior Backend Developer", "DevOps Engineer"],
      "skill_gap": ["Kubernetes", "Terraform", "CI/CD"],
      "recommendation_text": "## Narrative\nTransitioning to DevOps..."
    }
  ]
}
```

---

## Further Reading

- **Implementation Guide**: See `PLACIFY_ML_MODULES_ANALYSIS.md`
- **GitHub**: https://github.com/MonishRaman/Placify-Smarter_Placements-Sharper_Talent
- **SentenceTransformer Docs**: https://www.sbert.net/docs/
- **NetworkX Guide**: https://networkx.org/documentation/stable/

---

_Quick Reference Version: 1.0_  
_Last Updated: May 2026_
