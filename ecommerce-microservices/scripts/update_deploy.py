import re
import sys

file_path = r"c:/Users/91901/OneDrive/Desktop/E-Commerce/ecommerce-microservices/kubernetes/deployments/all-deployments.yaml"

with open(file_path, "r") as f:
    text = f.read()

# Replace image references
text = re.sub(r'image:\s*vignesh8386/([^:]+):latest', r'image: team4ofdevops/ecommerce:v1.0.0-\1', text)

# Replace configMapKeyRef for MONGO_URI with secretKeyRef
text = re.sub(
    r'(\s+)configMapKeyRef:\n(\s+)name: MyCart-config\n(\s+)key: MONGO_URI_(\w+)',
    r'\1secretKeyRef:\n\2name: MyCart-secrets\n\3key: MONGO_URI_\4',
    text
)

# Also replace the inline JWT_SECRET in auth-service with secretKeyRef
jwt_inline = """        - name: JWT_SECRET
          value: supersecretjwtkey_12345"""
jwt_secret_ref = """        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: MyCart-secrets
              key: JWT_SECRET"""

text = text.replace(jwt_inline, jwt_secret_ref)

with open(file_path, "w") as f:
    f.write(text)

print("Updated deployments")
