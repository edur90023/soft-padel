import { useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Base de datos del Club (Padel)
import { licenseDb } from '../services/licenseService'; // Base de datos del SaaS (Panel-Soft)

export const useLicense = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdAndListen = async () => {
      try {
        // 1. Buscamos la identidad del club en su propia base de datos
        const configRef = doc(db, 'club_config', 'main_config');
        const configSnap = await getDoc(configRef);
        
        // ID por defecto sacado de tu captura de pantalla del SaaS
        let licenseId = "7WlbYHPcvXivSLINHdqB"; 

        if (configSnap.exists() && configSnap.data().licenseKey) {
          licenseId = configSnap.data().licenseKey;
        }

        console.log("Validando licencia en SaaS para ID:", licenseId);

        // 2. Escuchamos el Panel SaaS (licenseDb) en tiempo real
        // Colección 'clients', Documento con el ID del cliente
        const clientRef = doc(licenseDb, "clients", licenseId);

        const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            // Si el SaaS dice isActive: false -> BLOQUEAR
            setIsLocked(data.isActive === false); 
            console.log(`Sincronización exitosa. Estado: ${data.isActive ? 'ACTIVO' : 'SUSPENDIDO'}`);
          } else {
            // Si no existe el cliente en el SaaS, bloqueamos por seguridad
            console.warn("El ID de cliente no existe en la base de datos administrativa.");
            setIsLocked(true);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error al conectar con la base de datos de licencias:", error);
          // Fallback: Si no hay internet o falla el SaaS, permitimos entrar 
          // para no afectar la operatividad del club por un fallo externo.
          setIsLocked(false);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Fallo crítico en el proceso de licencia:", error);
        setLoading(false);
      }
    };

    const unsubPromise = fetchIdAndListen();
    return () => {
      unsubPromise.then(unsub => unsub && (unsub as Function)());
    };
  }, []);

  return { isLocked, loading };
};
