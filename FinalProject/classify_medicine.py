import pandas as pd

# ======================
# 1. Đọc file dữ liệu
# ======================
df = pd.read_csv("FinalProject/Medicine_Details.csv")

# ======================
# 2. Hàm chuẩn hóa & phân loại
# ======================
def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).lower()

def classify_medicine(row):
    uses = clean_text(row["Uses"])
    comp = clean_text(row["Composition"])
    
    # Kháng sinh
    if any(kw in uses for kw in ["bacterial infection", "antibiotic"]) or \
       any(kw in comp for kw in ["cillin", "cycline", "mycin", "floxacin"]):
        return "Kháng sinh"
    
    # Giảm đau - Hạ sốt - Kháng viêm
    if any(kw in uses for kw in ["pain", "fever", "inflammation"]) or \
       any(kw in comp for kw in ["paracetamol", "ibuprofen", "diclofenac"]):
        return "Giảm đau - Hạ sốt - Kháng viêm"
    
    # Tim mạch - Huyết áp
    if any(kw in uses for kw in ["hypertension", "heart", "angina", "stroke"]) or \
       any(kw in comp for kw in ["olol", "pril", "sartan", "statin"]):
        return "Tim mạch - Huyết áp"
    
    # Ung thư
    if any(kw in uses for kw in ["cancer", "tumor", "oncology"]) or \
       any(kw in comp for kw in ["mab", "tinib", "platin"]):
        return "Ung thư"
    
    # Tiêu hóa - Gan mật
    if any(kw in uses for kw in ["acid reflux", "ulcer", "liver", "stomach", "digestive"]) or \
       any(kw in comp for kw in ["omeprazole", "ranitidine", "pantoprazole"]):
        return "Tiêu hóa - Gan mật"
    
    # Hô hấp - Cảm cúm
    if any(kw in uses for kw in ["cough", "asthma", "bronchitis", "flu", "cold", "respiratory"]) or \
       any(kw in comp for kw in ["salbutamol", "ambroxol", "guaifenesin"]):
        return "Hô hấp - Cảm cúm"
    
    # Vitamin & Khoáng chất
    if any(kw in uses for kw in ["vitamin", "supplement", "deficiency"]) or \
       any(kw in comp for kw in ["vitamin", "folic", "zinc", "calcium", "iron"]):
        return "Vitamin & Khoáng chất"
    
    return "Khác"

# ======================
# 3. Áp dụng phân loại
# ======================
df["Category"] = df.apply(classify_medicine, axis=1)

# ======================
# 4. Thống kê nhanh
# ======================
print("📊 Thống kê theo nhóm thuốc:")
print(df["Category"].value_counts())

# ======================
# 5. Xuất dữ liệu
# ======================
df.to_csv("Medicine_Classified.csv", index=False, encoding="utf-8-sig")
df.to_json("Medicine_Classified.json", orient="records", force_ascii=False, indent=2)

print("🎉 Đã xuất Medicine_Classified.csv và Medicine_Classified.json")
