import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Función callable: asigna rol "paciente" o "medico" al registrarse
 * Si es médico, se guarda la cédula y queda como "no verificado"
 */
export const registerUserWithRole = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "El usuario no está autenticado.");
  }

  const rol = data.rol; // "paciente" o "medico"
  const cedula = data.cedula || null;

  if (!rol || (rol === "medico" && !cedula)) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan datos requeridos.");
  }

  if (rol === "medico") {
    const esCedulaValida = /^\d{7,8}$/.test(cedula);
    if (!esCedulaValida) {
      throw new functions.https.HttpsError("invalid-argument", "Cédula no válida.");
    }
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { rol });

    const userProfileRef = admin.firestore()
      .collection("artifacts")
      .doc("default-app-id") // Reemplaza con tu APP_ID real
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("userProfile");

    await userProfileRef.set({
      rol,
      cedula: rol === "medico" ? cedula : null,
      verified: rol === "paciente" ? true : false,
      plan: "Gratuito",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { message: `Rol '${rol}' asignado exitosamente.` };
  } catch (error) {
    console.error("Error asignando rol:", error);
    throw new functions.https.HttpsError("internal", "No se pudo asignar el rol.");
  }
});

/**
 * Función callable: usada por un admin para aprobar o rechazar a un médico
 */
export const verifyMedicoProfile = functions.https.onCall(async (data, context) => {
  const callerClaims = context.auth?.token;

  if (!callerClaims || callerClaims.rol !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Solo un admin puede verificar médicos.");
  }

  const { uid, approved } = data; // uid del médico y si fue aprobado o no

  if (!uid || typeof approved !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "Datos incorrectos.");
  }

  try {
    const userProfileRef = admin.firestore()
      .collection("artifacts")
      .doc("default-app-id")
      .collection("users")
      .doc(uid)
      .collection("profile")
      .doc("userProfile");

    await userProfileRef.set({ verified: approved }, { merge: true });

    return { message: approved ? "Médico verificado." : "Médico marcado como no verificado." };
  } catch (error) {
    console.error("Error verificando médico:", error);
    throw new functions.https.HttpsError("internal", "No se pudo verificar al médico.");
  }
});
