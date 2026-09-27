import os
import re

RELEASE_DIR = 'release'
TEMPLATES_DIR = os.path.join(RELEASE_DIR, 'templates')

def write_to_template(filename, content):
    with open(os.path.join(TEMPLATES_DIR, filename), 'w') as f:
        f.write(content.strip() + '\n')

def to_camel_case(kebab_str):
    parts = kebab_str.split('-')
    return parts[0] + ''.join(x.title() for x in parts[1:])

values_dict = {
    "namespace": "MyCart"
}

def process_file(filepath, filename_suffix=None):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist.")
        return
        
    with open(filepath, 'r') as f:
        content = f.read()

    # Prepend \n to make split reliable if the first line is ---
    content = '\n' + content
    docs = re.split(r'\n---', content)
        
    for doc in docs:
        doc = doc.strip()
        if not doc: continue
        
        name_match = re.search(r'^\s*name:\s*([^\s]+)', doc, re.MULTILINE)
        kind_match = re.search(r'^kind:\s*([^\s]+)', doc, re.MULTILINE)
        
        if not name_match or not kind_match:
            continue
            
        name = name_match.group(1).strip()
        kind = kind_match.group(1).strip()
        
        # Helmfiy (replacing fixed namespaces with the values parameter)
        doc = re.sub(r'namespace:\s*MyCart', 'namespace: {{ .Values.namespace }}', doc)
        doc = re.sub(r'namespace:\s*shopverse', 'namespace: {{ .Values.namespace }}', doc)
        
        # Exclude Namespace definitions to prevent Helm ownership conflicts
        if kind == 'Namespace':
            continue
            
        file_name = f"{name}-{kind.lower()}.yaml"
        # Specifically requested file naming scheme:
        if kind == 'Deployment' and filename_suffix == 'deploy':
            file_name = f"{name}-deploy.yaml"
        elif kind == 'Service' and (filename_suffix == 'service' or '-service' not in file_name):
            file_name = f"{name}-service.yaml"
        
        camel_name = to_camel_case(name)
        
        if kind in ['Deployment', 'StatefulSet']:
            if camel_name not in values_dict:
                values_dict[camel_name] = {}
                
            # Extract and template replicas
            replicas_match = re.search(r'replicas:\s*(\d+)', doc)
            if replicas_match:
                rep_count = int(replicas_match.group(1))
                values_dict[camel_name]['replicas'] = rep_count
                doc = re.sub(r'replicas:\s*\d+', f'replicas: {{{{ .Values.{camel_name}.replicas }}}}', doc)
            else:
                values_dict[camel_name]['replicas'] = 1
                
            # Extract and template main application image (ignoring busybox initContainer)
            # Find the first image that is not busybox
            for line in doc.split('\n'):
                if 'image:' in line and 'busybox' not in line:
                    img_match = re.search(r'image:\s*([^\s:]+)(?::([^\s]+))?', line)
                    if img_match:
                        repo = img_match.group(1)
                        tag = img_match.group(2) if img_match.group(2) else "latest"
                        
                        values_dict[camel_name]['image'] = {
                            'repository': repo,
                            'tag': tag
                        }
                        original_img_str = line.strip()
                        new_img_str = f"image: {{{{ .Values.{camel_name}.image.repository }}}}:{{{{ .Values.{camel_name}.image.tag }}}}"
                        doc = doc.replace(original_img_str, new_img_str)
                    break
            
            # Parameterizing the mongodb volumeClaimTemplates StorageClass to nfs-client
            if name == 'mongodb' and kind == 'StatefulSet':
                doc = re.sub(r'storageClassName:\s*[^\s]+', 'storageClassName: nfs-client', doc)
                if 'storageClassName' not in doc and 'volumeClaimTemplates' in doc:
                    doc = doc.replace('accessModes:', 'storageClassName: nfs-client\n        accessModes:')
            
        write_to_template(file_name, doc)
        print(f"Created {file_name}")

def main():
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    
    # Process files
    process_file(os.path.join('kubernetes', 'deployments', 'all-deployments.yaml'), 'deploy')
    process_file(os.path.join('kubernetes', 'services', 'all-services.yaml'), 'service')
    process_file(os.path.join('kubernetes', 'configmaps', 'MyCart-config.yaml'))
    process_file(os.path.join('kubernetes', 'configmaps', 'secrets.yaml'))
    process_file(os.path.join('kubernetes', 'hpa', 'all-hpa.yaml'))
    process_file(os.path.join('kubernetes', 'deployments', 'mongodb-statefulset.yaml'))
    process_file(os.path.join('kubernetes', 'ingress', 'kgateway-routes.yaml'))
    process_file(os.path.join('kubernetes', 'services', 'nfs-storageclass.yaml'))
    
    # Create Chart.yaml
    chart_yaml = """apiVersion: v2
name: ecommerce-application
description: Helm chart for the E-Commerce microservices application
type: application
version: 0.1.0
appVersion: "1.0.0"
"""
    with open(os.path.join(RELEASE_DIR, 'Chart.yaml'), 'w') as f:
        f.write(chart_yaml)
        
    # Create values.yaml using yaml dump if available, else simple format
    # Using simple yaml builder to avoid missing PyYAML dependency
    def build_yaml(d, indent=0):
        result = ""
        for k, v in d.items():
            if isinstance(v, dict):
                result += " " * indent + f"{k}:\n"
                result += build_yaml(v, indent + 2)
            else:
                result += " " * indent + f"{k}: {v}\n"
        return result
        
    with open(os.path.join(RELEASE_DIR, 'values.yaml'), 'w') as f:
        f.write(build_yaml(values_dict))
    
    # Create namespace.yaml template to auto-create the namespace
    namespace_yaml = """apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
"""
    with open(os.path.join(TEMPLATES_DIR, 'namespace-auto-create.yaml'), 'w') as f:
        f.write(namespace_yaml)
        
    print("Helm chart parameterized and generated in 'release/' directory.")

if __name__ == '__main__':
    main()
