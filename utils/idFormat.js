export default function idFormat(id) {
  idToString = String(id);
  const idNumber = idToString.replace(/\D/g, "");
  return idNumber.substring(0, 8);
}
