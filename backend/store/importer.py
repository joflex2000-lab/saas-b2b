import pandas as pd
import json
import time
from django.db import transaction
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)

class ClientImporter:
    """
    Importa clientes desde Excel optimizado para alto rendimiento (1800+ registros).
    """

    def __init__(self, file):
        self.file = file

    def _clean_str(self, val):
        if pd.isna(val):
            return ""
        s = str(val).strip()
        if s.lower() == 'nan':
            return ""
        return s

    def _clean_float(self, val):
        if pd.isna(val):
            return 0.0
        try:
            return float(val)
        except:
            return 0.0

    def process_streaming(self, dry_run=True, update_passwords=False):
        """
        Generador que emite eventos de progreso JSON por línea.
        Eventos:
        - {"type": "progress", "current": 10, "total": 100}
        - {"type": "result", "success": true, ...}
        """
        try:
            df = pd.read_excel(self.file, dtype=str)
            
            if len(df.columns) < 13:
                 error_msg = f"El archivo tiene pocas columnas ({len(df.columns)}). Se requieren 13 columnas en el orden específico."
                 yield json.dumps({'type': 'error', 'message': error_msg}) + "\n"
                 return

            total_rows = len(df)
            
            stats = {
                'total_rows': 0,
                'to_create': 0,
                'to_update': 0,
                'errors': 0,
                'skipped': 0
            }
            
            preview_log = [] 
            errors_log = []
            users_to_create = []
            users_to_update = []
            existing_users = {u.username: u for u in CustomUser.objects.all()}
            processed_usernames = set()

            # Emit initial info
            yield json.dumps({'type': 'start', 'total': total_rows}) + "\n"

            for index, row in df.iterrows():
                # Emit progress every 10 rows or on last row
                if index % 10 == 0 or index == total_rows - 1:
                    yield json.dumps({'type': 'progress', 'current': index + 1, 'total': total_rows}) + "\n"

                row_idx = index + 2
                stats['total_rows'] += 1

                try:
                    raw_client_num = self._clean_str(row.iloc[0])
                    company_name   = self._clean_str(row.iloc[1])
                    contact_name   = self._clean_str(row.iloc[2])
                    client_type    = self._clean_str(row.iloc[3])
                    province       = self._clean_str(row.iloc[4])
                    address        = self._clean_str(row.iloc[5])
                    phone          = self._clean_str(row.iloc[6])
                    email          = self._clean_str(row.iloc[7])
                    tax_id         = self._clean_str(row.iloc[8])
                    discount_raw   = self._clean_float(row.iloc[9])
                    iva_condition  = self._clean_str(row.iloc[10])
                    raw_password   = self._clean_str(row.iloc[11])
                    username       = self._clean_str(row.iloc[12])

                    if not username:
                        errors_log.append(f"Fila {row_idx}: Ignorada - Falta el 'Usuario'.")
                        stats['errors'] += 1
                        continue
                    
                    if not company_name:
                        errors_log.append(f"Fila {row_idx}: Ignorada - Falta el 'Nombre'.")
                        stats['errors'] += 1
                        continue

                    if username in processed_usernames:
                        stats['errors'] += 1
                        continue
                    
                    processed_usernames.add(username)
                    discount_rate = discount_raw / 100.0 if discount_raw > 1 else discount_raw

                    if username in existing_users:
                        user = existing_users[username]
                        user.client_number = raw_client_num
                        user.company_name = company_name
                        user.contact_name = contact_name
                        user.client_type = client_type
                        user.province = province
                        user.address = address
                        user.phone = phone
                        user.email = email
                        user.tax_id = tax_id
                        user.discount_rate = discount_rate
                        user.iva_condition = iva_condition
                        
                        if update_passwords and raw_password:
                            if not dry_run:
                                user.set_password(raw_password)
                            user.plain_password = raw_password
                        
                        users_to_update.append(user)
                        stats['to_update'] += 1
                        
                        if len(preview_log) < 20: 
                             preview_log.append({'type': 'UPDATE', 'user': username, 'msg': f"Actualizar datos de {company_name}"})

                    else:
                        if not raw_password:
                            errors_log.append(f"Fila {row_idx}: Ignorada - Nuevo usuario sin contraseña.")
                            stats['errors'] += 1
                            continue
                            
                        new_user = CustomUser(
                            username=username,
                            company_name=company_name,
                            contact_name=contact_name,
                            client_type=client_type,
                            province=province,
                            address=address,
                            phone=phone,
                            email=email,
                            tax_id=tax_id,
                            discount_rate=discount_rate,
                            iva_condition=iva_condition,
                            client_number=raw_client_num,
                            role='CLIENT',
                            is_active=True,
                            plain_password=raw_password
                        )
                        if not dry_run:
                            new_user.set_password(raw_password)
                        users_to_create.append(new_user)
                        stats['to_create'] += 1
                        if len(preview_log) < 20:
                             preview_log.append({'type': 'CREATE', 'user': username, 'msg': f"Crear nuevo cliente {company_name}"})

                except Exception as row_e:
                    errors_log.append(f"Fila {row_idx}: Error {str(row_e)}")
                    stats['errors'] += 1

            # --- SAVING (Atomic) ---
            if not dry_run:
                yield json.dumps({'type': 'progress', 'current': total_rows, 'total': total_rows, 'message': 'Guardando en base de datos...'}) + "\n"
                
                if users_to_create:
                    CustomUser.objects.bulk_create(users_to_create, batch_size=500)
                
                if users_to_update:
                    fields = [
                        'client_number', 'company_name', 'contact_name', 'client_type',
                        'province', 'address', 'phone', 'email', 'tax_id', 
                        'discount_rate', 'iva_condition'
                    ]
                    if update_passwords:
                        fields.extend(['password', 'plain_password'])
                        
                    CustomUser.objects.bulk_update(users_to_update, fields, batch_size=500)

            result = {
                'success': True,
                'stats': stats,
                'preview': preview_log,
                'errors': errors_log
            }
            yield json.dumps({'type': 'result', 'data': result}) + "\n"

        except Exception as e:
            logger.error(f"Error crítico importador: {e}")
            yield json.dumps({'type': 'error', 'message': str(e)}) + "\n"

    def process(self, dry_run=True, update_passwords=False):
        try:
            # Leer excel con pandas. Asumimos fila 1 = headers.
            # dtype=str fuerza a leer todo como texto para evitar problemas (ej: CUIT como notación científica)
            df = pd.read_excel(self.file, dtype=str)
            
            # Validar número de columnas
            # El usuario especificó 13 columnas exactas en orden.
            if len(df.columns) < 13:
                 return {
                     'success': False, 
                     'error': f"El archivo tiene pocas columnas ({len(df.columns)}). Se requieren 13 columnas en el orden específico."
                 }

            stats = {
                'total_rows': 0,
                'to_create': 0,
                'to_update': 0,
                'errors': 0,
                'skipped': 0
            }
            
            preview_log = [] 
            errors_log = []
            
            users_to_create = []
            users_to_update = []
            
            # Pre-cargar usuarios existentes para optimización (O(1) lookup)
            existing_users = {u.username: u for u in CustomUser.objects.all()}
            # Cache para evitar duplicados dentro del mismo archivo excel
            processed_usernames = set()

            for index, row in df.iterrows():
                row_idx = index + 2  # Excel row number (1-index + header)
                stats['total_rows'] += 1

                try:
                    # Mapeo estricto por posición
                    raw_client_num = self._clean_str(row.iloc[0])
                    company_name   = self._clean_str(row.iloc[1])
                    contact_name   = self._clean_str(row.iloc[2])
                    client_type    = self._clean_str(row.iloc[3])
                    province       = self._clean_str(row.iloc[4])
                    address        = self._clean_str(row.iloc[5])
                    phone          = self._clean_str(row.iloc[6])
                    email          = self._clean_str(row.iloc[7])
                    tax_id         = self._clean_str(row.iloc[8])
                    discount_raw   = self._clean_float(row.iloc[9])
                    iva_condition  = self._clean_str(row.iloc[10])
                    raw_password   = self._clean_str(row.iloc[11])
                    username       = self._clean_str(row.iloc[12])

                    # --- VALIDACIONES BÁSICAS ---
                    if not username:
                        errors_log.append(f"Fila {row_idx}: Ignorada - Falta el 'Usuario' en columna 13.")
                        stats['errors'] += 1
                        continue
                    
                    if not company_name:
                        errors_log.append(f"Fila {row_idx}: Ignorada - Falta el 'Nombre' en columna 2.")
                        stats['errors'] += 1
                        continue

                    if username in processed_usernames:
                        errors_log.append(f"Fila {row_idx}: Ignorada - Usuario '{username}' duplicado en el archivo.")
                        stats['errors'] += 1
                        continue
                    
                    processed_usernames.add(username)

                    # Normalizar descuento
                    discount_rate = discount_raw / 100.0 if discount_raw > 1 else discount_raw

                    # --- LÓGICA UPDATE vs CREATE ---
                    if username in existing_users:
                        # === UPDATE ===
                        user = existing_users[username]
                        
                        # Actualizamos campos
                        user.client_number = raw_client_num
                        user.company_name = company_name
                        user.contact_name = contact_name
                        user.client_type = client_type
                        user.province = province
                        user.address = address
                        user.phone = phone
                        user.email = email
                        user.tax_id = tax_id
                        user.discount_rate = discount_rate
                        user.iva_condition = iva_condition
                        
                        # Password: Solo si se pide explícitamente y viene dato
                        if update_passwords and raw_password:
                            user.set_password(raw_password)
                            user.plain_password = raw_password
                        
                        users_to_update.append(user)
                        stats['to_update'] += 1
                        
                        if len(preview_log) < 20: 
                             preview_log.append({'type': 'UPDATE', 'user': username, 'msg': f"Actualizar datos de {company_name}"})

                    else:
                        # === CREATE ===
                        if not raw_password:
                            errors_log.append(f"Fila {row_idx}: Ignorada - Nuevo usuario '{username}' no tiene contraseña.")
                            stats['errors'] += 1
                            continue
                            
                        new_user = CustomUser(
                            username=username,
                            company_name=company_name,
                            contact_name=contact_name,
                            client_type=client_type,
                            province=province,
                            address=address,
                            phone=phone,
                            email=email,
                            tax_id=tax_id,
                            discount_rate=discount_rate,
                            iva_condition=iva_condition,
                            client_number=raw_client_num,
                            role='CLIENT',
                            is_active=True,
                            plain_password=raw_password
                        )
                        new_user.set_password(raw_password)
                        users_to_create.append(new_user)
                        
                        # Lo agregamos al diccionario para que si aparece de nuevo (caso raro) se updatee?
                        # Mejor no, ya validamos duplicados en archivo.
                        
                        stats['to_create'] += 1
                        if len(preview_log) < 20:
                             preview_log.append({'type': 'CREATE', 'user': username, 'msg': f"Crear nuevo cliente {company_name}"})

                except Exception as row_e:
                    errors_log.append(f"Fila {row_idx}: Error procesando datos - {str(row_e)}")
                    stats['errors'] += 1

            # --- EJECUCIÓN EN DB (Solo si no es dry_run) ---
            if not dry_run:
                # Bulk Create
                if users_to_create:
                    CustomUser.objects.bulk_create(users_to_create, batch_size=500)
                
                # Bulk Update
                if users_to_update:
                    fields = [
                        'client_number', 'company_name', 'contact_name', 'client_type',
                        'province', 'address', 'phone', 'email', 'tax_id', 
                        'discount_rate', 'iva_condition'
                    ]
                    if update_passwords:
                        fields.extend(['password', 'plain_password'])
                        
                    CustomUser.objects.bulk_update(users_to_update, fields, batch_size=500)

            return {
                'success': True,
                'stats': stats,
                'preview': preview_log,
                'errors': errors_log
            }

        except Exception as e:
            logger.error(f"Error crítico importador: {e}")
            return {'success': False, 'error': str(e)}
