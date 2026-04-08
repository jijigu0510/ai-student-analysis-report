import pandas as pd
import json
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF not installed. Please run: pip install PyMuPDF")
    sys.exit(1)

def extract_excel_data(path):
    print(f"Reading Excel: {path}")
    df = pd.read_excel(path)
    # Just convert the whole excel to a structured text or json representation
    # If it's a list of questions, converting to a list of dicts string representation is best
    # Or just convert rows to text
    text_content = ""
    for idx, row in df.iterrows():
        # Drop nan values
        row_clean = row.dropna()
        if len(row_clean) == 0:
            continue
        text_content += " | ".join(f"{k}: {v}" for k, v in row_clean.items()) + "\n"
    return text_content

def extract_pdf_data(path):
    print(f"Reading PDF: {path}")
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    return text

def main():
    excel_file = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\2023-2025 대학별 면접 기출문제 정리(안양고 도창준).xlsx"
    pdf1 = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\학과별 면접 기출 정리_1103.pdf"
    pdf2 = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\2026 면접 답변 코칭 예시문항.pdf"

    excel_text = extract_excel_data(excel_file)
    pdf1_text = extract_pdf_data(pdf1)
    pdf2_text = extract_pdf_data(pdf2)

    # Compile them into a JS file
    output_js = r"c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\프로그램\setuek_2\interview_data.js"
    
    data_obj = {
        "excel_data": excel_text,
        "pdf1_data": pdf1_text,
        "pdf2_data": pdf2_text
    }
    
    with open(output_js, "w", encoding="utf-8") as f:
        f.write("const interviewReferenceData = ")
        json.dump(data_obj, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    
    print(f"Successfully created {output_js}")

if __name__ == "__main__":
    main()
