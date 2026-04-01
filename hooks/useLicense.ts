import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { licenseDb } from '../services/licenseService';

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Incluye línea de depuración para verificar la respuesta del SaaS
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // ID exacto del documento en tu colección 'clients' del SaaS (Panel-Soft)
  const LICENSE_ID = "7WlbYHPcvXivSLINHdqB"; 

  useEffect(() => {
    if (!LICENSE_ID) {
      console.error("⚠️ ERROR: Falta el ID de licencia.");
      setLoading(false);
      return;
    }

    // Referencia al documento en la base de datos administrativa
    const clientRef = doc(licenseDb, "clients", LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      // --- NUEVA LÍNEA DE DEPURACIÓN ---
      console.log("DATOS RECIBIDOS DEL SAAS:", docSnapshot.data());
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Si isActive es false en el SaaS -> BLOQUEAR
        setIsLocked(data.isActive === false); 
        console.log(`Licencia ${LICENSE_ID} verificada. Activo: ${data.isActive}`);
      } else {
        // Si no existe el documento en la base de datos del SaaS -> BLOQUEO
        console.error("ID de licencia no encontrado en el panel administrativo.");
        setIsLocked(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error de conexión con el servicio de licencias:", error);
      // Fail-Safe: Si falla la conexión por red, permitimos el acceso temporal
      setIsLocked(false); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
