// ARCHIVO COMPLETO: src/hooks/useLicense.ts
import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Importación corregida para evitar error en Vercel

/**
 * Hook para controlar el estado del servicio remoto (Kill Switch)
 * Lee el Serial/LicenseKey desde la configuración del club en Firebase
 */
export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtenemos la referencia a la configuración propia del club
    const configRef = doc(db, 'club_config', 'main_config');

    const checkStatus = async () => {
      try {
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const configData = configSnap.data();
          // Este es el campo que debes crear en Firebase con el valor 'cuesta_padel'
          const licenseKey = configData.licenseKey;

          if (!licenseKey) {
            console.warn("Falta licenseKey en club_config/main_config. Bloqueando por seguridad.");
            setIsLocked(true);
            setLoading(false);
            return;
          }

          // 2. Con el ID del cliente, escuchamos la colección de administración 'clients'
          const clientRef = doc(db, 'clients', licenseKey);
          
          const unsubClient = onSnapshot(clientRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const clientData = docSnapshot.data();
              // Bloqueamos si isActive es estrictamente false en el Panel SaaS
              setIsLocked(clientData.isActive === false);
            } else {
              // Si el ID no existe en el panel administrativo, bloqueamos
              setIsLocked(true);
            }
            setLoading(false);
          }, (err) => {
            console.error("Error en comunicación de licencia:", err);
            setLoading(false);
          });

          return unsubClient;
        } else {
          console.error("No se encontró el documento de configuración inicial.");
          setIsLocked(true);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error al validar licencia:", error);
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { isLocked, loading };
};
