from django.core.management.base import BaseCommand
from store.importer import ClientImporter
import pandas as pd
import os

class Command(BaseCommand):
    help = 'Verify Client Importer Logic'

    def handle(self, *args, **kwargs):
        print("--- INICIANDO TEST DE IMPORTADOR ---")
        
        # 1. Crear archivo Excel de prueba
        data = {
            'N°': ['1001', '1002', '1003'],
            'Nombre': ['Empresa A', 'Empresa B', 'Empresa C'],
            'Contacto': ['Juan', 'Pedro', ''],
            'Tipo de cliente': ['Mayorista', 'Minorista', 'Otro'],
            'Provincia': ['CABA', 'GBA', 'Cordoba'],
            'Domicilio': ['Av 1', 'Calle 2', ''],
            'Telefonos': ['111', '222', ''],
            'Email': ['a@test.com', 'b@test.com', ''],
            'CUIT/DNI': ['20111111111', '20222222222', ''],
            'Descuento': [10, 0, 5],
            'Cond.IVA': ['RI', 'MONO', ''],
            'Contraseña': ['pass1', 'pass2', 'pass3'],
            'Usuario': ['user_a_test', 'user_b_test', 'user_c_test']
        }
        
        # Añadir caso de error: Falta usuario
        data['N°'].append('1004')
        data['Nombre'].append('Error User')
        data['Contacto'].append('')
        data['Tipo de cliente'].append('')
        data['Provincia'].append('')
        data['Domicilio'].append('')
        data['Telefonos'].append('')
        data['Email'].append('')
        data['CUIT/DNI'].append('')
        data['Descuento'].append(0)
        data['Cond.IVA'].append('')
        data['Contraseña'].append('pass4')
        data['Usuario'].append('') # ERROR

        df = pd.DataFrame(data)
        filename = 'test_clients_cmd.xlsx'
        df.to_excel(filename, index=False)
        
        print(f"Archivo {filename} creado con {len(df)} filas.")

        # 2. Ejecutar Importer en DRY RUN
        print("\n>>> Probando DRY RUN...")
        try:
            importer = ClientImporter(filename)
            result = importer.process(dry_run=True)
            
            print(f"Success: {result['success']}")
            print(f"Stats: {result['stats']}")
            print(f"Errors ({len(result['errors'])}):")
            for e in result['errors']:
                print(f"  - {e}")
                
            # Validaciones
            if result['success'] and result['stats']['total_rows'] == 4 and result['stats']['to_create'] >= 3:
                self.stdout.write(self.style.SUCCESS("VERIFICACION EXITOSA"))
            else:
                self.stdout.write(self.style.ERROR("FALLO EN VERIFICACION"))

        except Exception as e:
             self.stdout.write(self.style.ERROR(f"EXCEPCION: {e}"))
        
        # 3. Limpiar
        if os.path.exists(filename):
            os.remove(filename)
