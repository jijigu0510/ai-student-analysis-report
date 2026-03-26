#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# 파일 읽기
with open("app.js", "rb") as f:
    content = f.read()

# 찾을 문자열 (가천대 weights 이후)
# Note: 실제 한글은 유니코드로 인코딩되어 있음
search_start = b"weights: { academic: 0.20, career: 0.40, community: 0.40 } // "

# 인덱스 찾기
idx = content.find(search_start)
if idx == -1:
    print("ERROR: Search string not found!")
    exit(1)

print(f"Found weights at byte position: {idx}")

# weights 라인의 끝을 찾기 (다음 줄까지)
# 라인엔딩 구조: } // 코멘트 + \n + 공백 + } + \n + 공백 + };
# 충분히 복잡하니 } 다음의 } + newline + } 를 찾자

# 더 간단한 방법: search_start부터 다음 라인과 그 다음 라인까지 찾기
search_full = b"""weights: { academic: 0.20, career: 0.40, community: 0.40 } // \\uac00\\ucc9c\\ub300\\ub9cc\\uc758 20-40-40 \\ub3c5\\uc790 \\uc138\\ud305
      }
    };"""

idx = content.find(search_full)
if idx == -1:
    print("ERROR: Could not find complete search string")
    print("Trying alternate approach...")
    # 바이트 단위로 찾기
    idx = content.find(b"weights: { academic: 0.20, career: 0.40, community: 0.40 }")
    if idx >= 0:
        # 현재 위치에서 다음 } 까지 찾기 (closing brace for the university object)
        temp_idx = idx
        # 주석까지 찾기
        while temp_idx < len(content) and content[temp_idx:temp_idx+10] != b"}\n    };":
            temp_idx += 1
        search_full = content[idx:temp_idx+8]  # } 와 newline과 }; 포함
        print(f"Using alternate search range of length: {len(search_full)}")
    else:
        exit(1)

print(f"Search string length: {len(search_full)}")
print(f"Found at position: {idx}")

# 새로운 경희대학교 항목 생성 (한글은 \uXXXX 형식으로 표현)
# 키: "\uacbd\ud76c\ub300\ud559\uad50" = 경희대학교
new_entry = b""",
      "\\uacbd\\ud76c\\ub300\\ub77c\\ubb58\\uad50": {
        factors: `
[\\uacbd\\ud76c\\ub300\\ud559\\uad50 2026\\ud559\\ub144\\ub3c4 \\ud559\\uc0dd\\ubd80\\uc885\\ud569\\uc804\\ud615 \\uc11c\\ub958\\ud3c9\\uac00 \\uae30\\uc900 \\ubc0f \\ud559\\uacfc\\ubcc4 \\ub3d9\\ub4f1 \\uc120\\ubc1c\\uae30]

*KYUNG HEE UNIVERSITY ADMISSION CRITERIA*
- 10 Major Categories Evaluation
- Academic Achievement, Career Aptitude, Community Service
- Total Score Base: 100 points
`,
        competencies: {
          academic: "\\uba54\\uc774\\jor Academic: 40-50% - Grades in major-related courses, academic improvement trends",
          career: "Career Exploration: 30-35% - Genuine career interest, depth of major-related learning",
          community: "Community Engagement: 20-25% - Leadership, service, integrity, collaboration"
        },
        weights: { academic: 0.35, career: 0.40, community: 0.25 }
      }
    };"""

# 새로운 내용 생성
new_content = content[:idx] + new_entry + content[idx+len(search_full):]

# 파일 쓰기
with open("app.js", "wb") as f:
    f.write(new_content)

print("✓ File updated successfully!")
print(f"New file size: {len(new_content)} bytes")
