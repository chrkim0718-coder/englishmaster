import packageJson from '../../package.json';
import fs from 'fs';
import path from 'path';

export default function VersionPage() {
  let lastCommit = '';
  try {
    const filePath = path.join(process.cwd(), '.last_commit.txt');
    lastCommit = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    lastCommit = '커밋 정보 파일을 불러올 수 없습니다.';
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>버전 정보</h1>
      <ul>
        <li><b>앱 버전:</b> {packageJson.version}</li>
        <li><b>앱 이름:</b> {packageJson.name}</li>
        <li><b>마지막 커밋:</b> {lastCommit}</li>
      </ul>
    </div>
  );
}
