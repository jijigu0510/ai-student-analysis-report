import os

file_path = r'c:\Users\user\OneDrive - 부안고등학교\부안고등학교(1)\새 폴더\app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines are 1-indexed in view_file:
# 170:     },
# 171:     "\uc5f0... (TO DELETE)
# 172:     }, (TO DELETE)
# 173:     "\uc5f0...

# In 0-indexing:
# index 170 is line 171
# index 171 is line 172

del lines[171] # Deletes line 172
del lines[170] # Deletes line 171

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(lines)

print("Repair complete: Deleted lines 171 and 172.")
