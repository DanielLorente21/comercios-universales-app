// ════════════════════════════════════════════════════════════════════════════
// src/services/pdf.js — Generación de PDF · Comercios Universales
// ════════════════════════════════════════════════════════════════════════════

import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { calcularDias } from '../utils/calcularDias';
import { cargarFestivosSet } from './firestore';

export const generarPDF = async (permiso, empleado) => {
  try {
    const festivosMapPDF = await cargarFestivosSet().catch(() => ({}));
    const dias = calcularDias(permiso.fechaInicio, permiso.fechaFin, festivosMapPDF);
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; background: white; }
.header { text-align: center; border-bottom: 3px solid #2C4A8C; padding-bottom: 20px; margin-bottom: 30px; }
.logo { font-size: 22px; font-weight: bold; color: #2C4A8C; }
.subtitulo { font-size: 14px; color: #666; margin-top: 6px; }
.sello-wrap { margin: 16px 0; }
.sello { display: inline-block; background: #EDF7ED; border: 2px solid #4CAF7D; color: #2E7D32; padding: 8px 24px; border-radius: 30px; font-weight: bold; font-size: 15px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
tr { border-bottom: 1px solid #EEF2FB; }
td { padding: 11px 4px; font-size: 13px; }
td:first-child { color: #888; width: 40%; }
td:last-child { font-weight: 600; color: #1a1a2e; text-align: right; }
.estado-ok { color: #4CAF7D; font-weight: bold; }
.firmas { display: flex; justify-content: space-around; margin-top: 50px; }
.firma-box { text-align: center; width: 200px; }
.linea-firma { border-top: 1px solid #1a1a2e; margin-bottom: 8px; }
.firma-label { font-size: 12px; color: #888; }
.footer { margin-top: 30px; text-align: center; color: #bbb; font-size: 10px; border-top: 1px solid #EEF2FB; padding-top: 16px; }
</style></head><body>
<div class="header">
  <div class="logo"><img src="data:image/png;base64,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" style="height:90px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" /><br>Comercios Universales</div>
  <div class="subtitulo">Comprobante de Permiso Laboral</div>
  <div class="sello-wrap"><span class="sello">✅ APROBADO</span></div>
</div>
<table>
  <tr><td>Empleado</td><td>${permiso.nombre}</td></tr>
  <tr><td>Código</td><td>${permiso.codigo}</td></tr>
  <tr><td>Cargo</td><td>${permiso.cargo}</td></tr>
  <tr><td>Departamento</td><td>${permiso.departamento}</td></tr>
  <tr><td>Tipo de permiso</td><td>${permiso.tipo}</td></tr>
  ${permiso.tipo === 'Horas'
    ? `<tr><td>Fecha</td><td>${permiso.fechaInicio}</td></tr>
       <tr><td>Horas solicitadas</td><td>${permiso.horasSolicitadas}h</td></tr>`
    : `<tr><td>Fecha inicio</td><td>${permiso.fechaInicio}</td></tr>
       <tr><td>Fecha fin</td><td>${permiso.fechaFin}</td></tr>
       <tr><td>Días</td><td>${dias % 1 === 0 ? dias : dias.toFixed(1)}</td></tr>`}
  <tr><td>Motivo</td><td>${permiso.motivo}</td></tr>
  <tr><td>Estado</td><td class="estado-ok">APROBADO</td></tr>
  <tr><td>Aprobado por</td><td>${permiso.aprobadoPor || 'No registrado'}</td></tr>
  <tr><td>Fecha aprobación</td><td>${permiso.fechaAprobacion || 'No registrada'}</td></tr>
  ${permiso.tipo === 'Horas' && permiso.horaAprobacion
    ? `<tr><td>🟢 Hora de salida</td><td>${permiso.horaAprobacion}</td></tr>` : ''}
  ${permiso.tipo === 'Horas' && permiso.horaRegreso
    ? `<tr><td>🔵 Hora de regreso</td><td>${permiso.horaRegreso}</td></tr>` : ''}
  ${permiso.tipo === 'Horas' && permiso.tiempoRealMinutos
    ? `<tr><td>⏱️ Tiempo real</td><td>${permiso.tiempoRealMinutos} min</td></tr>` : ''}
  ${permiso.tipo === 'Horas' && permiso.descuentoResuelto === 'true'
    ? `<tr><td>💳 Descuento aplicado</td><td>${
        permiso.diasDescontados === '0'   ? 'Sin descuento' :
        permiso.diasDescontados === '0.5' ? '½ día'         : '1 día completo'
      }</td></tr>` : ''}
  <tr><td>Fecha emisión</td><td>${new Date().toLocaleDateString('es-GT')}</td></tr>
</table>
<div class="firmas">
  <div class="firma-box"><div class="linea-firma"></div><div class="firma-label">Firma del Empleado</div></div>
  <div class="firma-box"><div class="linea-firma"></div><div class="firma-label">Firma del Aprobador</div></div>
</div>
<div class="footer">Documento generado automáticamente por el Sistema de Permisos — Comercios Universales S.A.</div>
</body></html>`;

    if (Platform.OS === 'web') {
      const htmlConBoton = html
        .replace('</style>', `
@media print {
  @page { margin: 0; size: A4; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 40px !important; }
  .no-print { display: none !important; }
}
</style>`)
        .replace('</body>', `<div class="no-print" style="text-align:center;margin:20px"><button onclick="window.print()" style="background:#2C4A8C;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:15px;cursor:pointer;font-weight:bold">📄 Guardar como PDF</button></div></body>`);
      const blobFinal = new Blob([htmlConBoton], { type: 'text/html' });
      window.open(URL.createObjectURL(blobFinal), '_blank');
    } else {
      const { uri: uriTemporal } = await Print.printToFileAsync({ html, base64: false });
      let uriFinal = uriTemporal;
      try {
        const FileSystem = await import('expo-file-system');
        const now = new Date();
        const dd  = String(now.getDate()).padStart(2, '0');
        const mm  = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const nombreArchivo = `permiso_${permiso.codigo}_${dd}-${mm}-${yyyy}.pdf`;
        const uriCache = `${FileSystem.cacheDirectory}${nombreArchivo}`;
        await FileSystem.copyAsync({ from: uriTemporal, to: uriCache });
        uriFinal = uriCache;
      } catch (e) { console.log('FileSystem no disponible:', e.message); }
      const puedeCompartir = await Sharing.isAvailableAsync();
      if (puedeCompartir) {
        await Sharing.shareAsync(uriFinal, { mimeType: 'application/pdf', dialogTitle: 'Comprobante de Permiso', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('✅ PDF generado', 'El comprobante fue guardado correctamente.');
      }
    }
  } catch (e) { Alert.alert('Error', 'No se pudo generar el PDF: ' + e.message); }
};
