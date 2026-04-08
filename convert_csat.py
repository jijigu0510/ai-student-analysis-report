import pandas as pd
import json

file_path = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\27대입 수능최저 기준 배치(은광여고 이동균).xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=3)
# Clean up columns
df = df.rename(columns={
    "Unnamed: 1": "NO",
    "Unnamed: 2": "평균등급",
    "Unnamed: 3": "기준",
    "Unnamed: 4": "지역",
    "Unnamed: 5": "대학",
    "Unnamed: 6": "전형",
    "Unnamed: 7": "전형명",
    "Unnamed: 8": "학과",
    "대입연구회 다온": "최저기준"
})

# Drop rows where 기준 is NaN
df = df.dropna(subset=['기준'])

records = []
for idx, row in df.iterrows():
    kijun = str(row['기준'])
    
    # Simple parser for 'N개 합 M' or 'N합 M'
    # Examples might include "3개 합 7", "4개 합 5", "2합 5", "1합 3"
    # Will use regex to extract digits
    import re
    matches = re.findall(r'\d+', kijun)
    num_subjects = None
    sum_grades = None
    if len(matches) >= 2:
        num_subjects = int(matches[0])
        sum_grades = int(matches[1])
    elif len(matches) == 1:
        # Sometimes it might just be "2등급 2개" -> subjects=2, sum=4
        if "등급" in kijun and "개" in kijun:
             # e.g., "3등급 2개"
             continue

    if num_subjects and sum_grades:
        records.append({
            "평균등급": row['평균등급'] if not pd.isna(row['평균등급']) else "",
            "지역": row['지역'] if not pd.isna(row['지역']) else "",
            "대학": row['대학'] if not pd.isna(row['대학']) else "",
            "전형": row['전형'] if not pd.isna(row['전형']) else "",
            "전형명": row['전형명'] if not pd.isna(row['전형명']) else "",
            "학과": row['학과'] if not pd.isna(row['학과']) else "",
            "최저기준": row['최저기준'] if not pd.isna(row['최저기준']) else "",
            "기준문자열": kijun,
            "과목수": num_subjects,
            "등급합": sum_grades
        })

with open(r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\csat_data.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(records)} valid records.")
