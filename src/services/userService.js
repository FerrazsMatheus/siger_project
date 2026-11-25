import { collection, doc, getDoc, getDocs, query, setDoc, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase'

const COLECAO_USERS = 'users'

export async function criarDocumentoUsuario(
  uid,
  {
    name,
    email,
    role = 'aluno',
    verifiedAccountId = null,
    turmaId = null,
    turmaNome = '',
    matricula = '',
    status = 'cadastrada',
  },
) {
  const refUsuario = doc(db, COLECAO_USERS, uid)

  await setDoc(refUsuario, {
    name,
    email,
    role,
    verifiedAccountId,
    turmaId,
    turmaNome,
    matricula,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function buscarDocumentoUsuario(uid) {
  const refUsuario = doc(db, COLECAO_USERS, uid)
  const snapshot = await getDoc(refUsuario)

  return snapshot.exists() ? snapshot.data() : null
}

export async function listarUsuariosPorPerfil(role) {
  const consulta = query(collection(db, COLECAO_USERS), where('role', '==', role))
  const snapshot = await getDocs(consulta)

  return snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }))
}
