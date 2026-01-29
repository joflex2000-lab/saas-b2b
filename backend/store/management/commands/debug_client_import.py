from django.core.management.base import BaseCommand
from store.importer import ClientImporter
import os

class Command(BaseCommand):
    help = 'Test client import from uploaded file'

    def handle(self, *args, **options):
        file_path = 'importar_clientes.xlsx' 
        self.stdout.write(f"Iniciando debug de importación para {file_path}...")
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'Archivo {file_path} no encontrado en {os.getcwd()}'))
            return
            
        try:
            with open(file_path, 'rb') as f:
                importer = ClientImporter(f)
                result = importer.process()
                
            if result.get('success'):
                self.stdout.write(self.style.SUCCESS('EXITO'))
                self.stdout.write(f"Creados: {result.get('created')}")
                self.stdout.write(f"Actualizados: {result.get('updated')}")
                
                if result.get('errors'):
                    self.stdout.write(self.style.WARNING(f"\nErrores ({len(result.get('errors'))}):"))
                    for err in result.get('errors')[:10]:
                        self.stdout.write(f"- {err}")
            else:
                self.stdout.write(self.style.ERROR('FALLO'))
                self.stdout.write(str(result))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Excepción no controlada: {str(e)}'))
            import traceback
            traceback.print_exc()
