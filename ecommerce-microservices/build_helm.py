import os
import re
import json

files_to_process = [
    r'kubernetes\deployments\all-deployments.yaml',
    r'kubernetes\services\all-services-backup.yaml',
    r'kubernetes\configmaps\MyCart-config.yaml',
    r'kubernetes\configmaps\secrets.yaml',
    r'kubernetes\hpa\all-hpa.yaml',
    r'kubernetes\deployments\mongodb-statefulset.yaml'
]

RELEASE_DIR = r'release'
TEMPLATES_DIR = os.path.join(RELEASE_DIR, 'templates')

os.makedirs(TEMPLATES_DIR, exist_ok=True)

values = {
  "namespace": "MyCart"
}

def to_camel_case(kebab_str):
    parts = kebab_str.split('-')
    return parts[0] + ''.join(x.title() for x in parts[1:])

def process_file(filepath, is_deployment):
    with open(filepath, 'r') as f:
        content = f.read()

    docs = re.split(r'\n---', content)
    for doc in docs:
        doc = doc.strip()
        if not doc:
            continue
        
        if doc.startswith('---'):
            doc = doc[3:].strip()
            
        name_match = re.search(r'metadata:\s*\n\s*name:\s*([^\n]+)', doc)
        kind_match = re.search(r'kind:\s*([^\n]+)', doc)
        
        if not name_match or not kind_match:
            continue
            
        name = name_match.group(1).strip()
        kind = kind_match.group(1).strip()
        
        doc = re.sub(r'namespace:\s*MyCart', 'namespace: {{ .Values.namespace }}', doc)
        
        camel_name = to_camel_case(name)
        file_name = f"{name}-{kind.lower()}.yaml"
        
        if kind == 'Namespace':
            continue
            
        if kind in ['Deployment', 'StatefulSet']:
            if camel_name not in values:
                values[camel_name] = {}
                
            # Extract and template replicas
            replicas_match = re.search(r'replicas:\s*(\d+)', doc)
            if replicas_match:
                rep_count = int(replicas_match.group(1))
                values[camel_name]['replicas'] = rep_count
                doc = re.sub(r'replicas:\s*\d+', f'replicas: {{{{ .Values.{camel_name}.replicas }}}}', doc)
            else:
                values[camel_name]['replicas'] = 1
                
            # Extract and template main application image (ignoring busybox initContainer)
            image_match = re.search(r'image:\s*(team4devops/[^\s:]+|mongo):([^\s]+)', doc)
            if image_match:
                repo = image_match.group(1)
                tag = image_match.group(2)
                values[camel_name]['image'] = {
                    'repository': repo,
                    'tag': tag
                }
                original_imgStr = f"image: {repo}:{tag}"
                doc = doc.replace(original_imgStr, f'image: {{{{ .Values.{camel_name}.image.repository }}}}:{{{{ .Values.{camel_name}.image.tag }}}}')

        with open(os.path.join(TEMPLATES_DIR, file_name), 'w') as f:
            f.write(doc)

for f in files_to_process:
    process_file(f, False)

# Write Chart.yaml
chart_yaml = """apiVersion: v2
name: ecommerce-microservices
description: A Helm chart for Ecommerce Microservices
type: application
version: 0.1.0
appVersion: "1.0.0"
"""

with open(os.path.join(RELEASE_DIR, 'Chart.yaml'), 'w') as f:
    f.write(chart_yaml)
    
# Write values.yaml
import yaml
with open(os.path.join(RELEASE_DIR, 'values.yaml'), 'w') as f:
    yaml.dump(values, f, default_flow_style=False)

print("success")
