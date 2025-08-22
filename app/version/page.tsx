import packageJson from '../../package.json';

export default function VersionPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1>버전 정보</h1>
      <ul>
        <li><b>앱 버전:</b> {packageJson.version}</li>
        <li><b>앱 이름:</b> {packageJson.name}</li>
        <li><b>커밋/빌드 정보:</b> 환경에 따라 추가 가능</li>
      </ul>
    </div>
  );
}
