import os
import sys

print("DEBUG: Iniciando script...")
# Configurar entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
print("DEBUG: Haciendo django.setup()...")
django.setup()
print("DEBUG: Django setup OK")

from store.importer import ClientImporter

def run_debug():
    file_path = 'importar_clientes.xlsx'
    
    if not os.path.exists(file_path):
        print(f"❌ Error: No se encuentra el archivo {file_path}")
        return

    print(f"[*] Iniciando importacion de {file_path}...")
    
    try:
        # Abrir archivo en modo binario
        with open(file_path, 'rb') as f:
            importer = ClientImporter(f)
            result = importer.process()
            
        print("\n[OK] Importacion finalizada.")
        print("-" * 50)
        
        if result.get('success'):
            print(f"[EXITO]")
            print(f"+ Creados: {result.get('created')}")
            print(f"~ Actualizados: {result.get('updated')}")
            print(f"> Saltados: {result.get('skipped')}")
            
            errors = result.get('errors', [])
            if errors:
                print(f"\n[!] Advertencias ({len(errors)}):")
                for err in errors[:10]:
                    print(f"  - {err}")
                if len(errors) > 10:
                    print(f"  ... y {len(errors)-10} mas.")
        else:
            print(f"[FALLO]")
            print(f"Error: {result.get('error')}")
            
    except Exception as e:
        print(f"\n[ERROR] CRITICO EN SCRIPT:")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_debug()
