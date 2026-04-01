// src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { licenseDb } from '../services/licenseService'; // Base de datos del SaaS

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // ID exacto del documento en tu colección 'clients' del SaaS
  const LICENSE_ID = "7WlbYHPcvXivSLINHdqB"; 

  useEffect(() => {
    // Escucha el documento en la base de datos administrativa
    const clientRef = doc(licenseDb, "clients", LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Bloquea si isActive es false en el SaaS
        setIsLocked(data.isActive === false); 
      } else {
        // Bloqueo de seguridad si el documento no existe
        setIsLocked(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error de licencia:", error);
      setIsLocked(false); // Fail-safe: permite acceso si falla la conexión
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
