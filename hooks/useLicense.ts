import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { licenseDb } from '../services/licenseService'; //

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // ID exacto que aparece en tu captura de pantalla de Firebase
  const LICENSE_ID = "7WlbYHPcvXivSLINHdqB"; 

  useEffect(() => {
    // Escuchamos el documento en la base de datos administrativa (SaaS)
    const clientRef = doc(licenseDb, "clients", LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Si isActive es false en el SaaS, bloqueamos la app de padel
        setIsLocked(data.isActive === false); 
        console.log("Estado de licencia verificado en SaaS:", data.isActive);
      } else {
        // Si no encuentra el documento en el SaaS, bloqueamos por seguridad
        console.error("ID de licencia no encontrado en el panel administrativo.");
        setIsLocked(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error al conectar con la base de datos de licencias:", error);
      // Fail-safe: si falla la conexión, permitimos el acceso
      setIsLocked(false); 
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
