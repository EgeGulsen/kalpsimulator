// Sayfadaki betikler klasik <script> olduğu için Vite onları paketlemez; derlemeden sonra dist/ içine kopyalanır.
import { cpSync, existsSync } from 'node:fs';
for (const dir of ['js', 'css', 'assets']) {
  if (existsSync(dir)) cpSync(dir, `dist/${dir}`, { recursive: true });
}
console.log('js/, css/ ve assets/ dist/ içine kopyalandı.');
