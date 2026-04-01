// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; //

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Forzamos el ID que ya confirmamos que existe en el Panel SaaS
  const LICENSE_ID = "7WlbYHPcvXivSLINHdqB"; //

  useEffect(() => {
    // Escuchamos directamente la colección 'clients' 
    // IMPORTANTE: Asegúrate de que el proyecto de Padel tenga acceso a esta colección
    const clientRef = doc(db, 'clients', LICENSE_ID);

    const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Si isActive es false, el servicio está suspendido
        setIsLocked(data.isActive === false);
        console.log("Licencia validada correctamente:", data.isActive ? "ACTIVO" : "BLOQUEADO");
      } else {
        // Si no encuentra el documento en este proyecto de Firebase,
        // significa que la colección 'clients' no existe aquí.
        console.error("No se encontró el documento de licencia en este proyecto.");
        setIsLocked(false); // Por ahora lo dejamos en false para que puedas entrar mientras corregimos la DB
      }
      setLoading(false);
    }, (error) => {
      console.error("Error de Firebase al validar licencia:", error);
      setIsLocked(false); // Fallback de seguridad para no bloquearte por error de conexión
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isLocked, loading };
};
