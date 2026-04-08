import pandas as pd
import json

file_path = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\27대입 수능최저 기준 배치(은광여고 이동균).xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=3)
headers = df.columns.tolist()
sample = df.head(10).fillna("").to_dict(orient='records')
with open(r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\tmp_excel.json", "w", encoding="utf-8") as f:
    json.dump({"headers": headers, "sample": sample}, f, ensure_ascii=False, indent=2)
