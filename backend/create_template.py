import pandas as pd
import os

def create_template():
    # Definir columnas esperadas
    data = {
        'SKU': ['TAL-001', 'AMOL-002', 'SIER-003'],
        'Nombre': ['Taladro Percutor 700W', 'Amoladora Angular', 'Sierra Circular'],
        'Precio': [150000, 120000, 180000],
        'Stock': [50, 30, 20],
        'Marca': ['Dewalt', 'Makita', 'Bosch'],
        'Categoria': ['Herramientas', 'Herramientas', 'Herramientas'],
        'Subcategoria': ['Electricas', 'Electricas', 'Corte'],
        'Descripcion': ['Taladro profesional...', 'Ideal para metal...', 'Corte preciso...']
    }
    
    df = pd.DataFrame(data)
    
    filename = 'plantilla_productos_v1.xlsx'
    df.to_excel(filename, index=False)
    print(f"✅ Plantilla creada exitosamente: {os.path.abspath(filename)}")
    print("Columnas: SKU, Nombre, Precio, Stock, Marca, Categoria, Subcategoria, Descripcion")

if __name__ == "__main__":
    create_template()
