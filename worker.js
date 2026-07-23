export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);

    try {
      // =========================================================================
      // 🟢 VÙNG 1: CÁC API SELECT (CÔNG KHAI - KHÔNG CẦN TOKEN/KEY)
      // =========================================================================

      // 1. API Lấy danh sách sách
      if (url.pathname === '/api/books' && request.method === 'GET') {
        const { results } = await env.DB.prepare(`
          SELECT id, title, slug, summary, created_at FROM books ORDER BY id DESC
        `).all();

        return new Response(JSON.stringify({ success: true, data: results }), { headers });
      }

      // 2. API Xem chi tiết 1 cuốn sách theo Slug
      if (url.pathname.startsWith('/api/books/') && request.method === 'GET') {
        const slug = url.pathname.split('/')[3];
        const book = await env.DB.prepare(`
          SELECT * FROM books WHERE slug = ?
        `).bind(slug).first();

        if (!book) {
          return new Response(JSON.stringify({ success: false, message: 'Không tìm thấy sách' }), { status: 404, headers });
        }

        return new Response(JSON.stringify({ success: true, data: book }), { headers });
      }


      // =========================================================================
      // 🔒 VÙNG 2: BẢO MẬT (KIỂM TRA TOKEN TRƯỚC KHU VỰC GHI DỮ LIỆU)
      // =========================================================================

      // Ví dụ: Kiểm tra Token từ Header "Authorization: Bearer <token>"
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: '⛔ Bạn cần đăng nhập (User Token) để thực hiện thao tác này!' 
        }), { status: 401, headers });
      }

      // Lấy Token ra để kiểm tra
      const token = authHeader.split(' ')[1];
      // (Thêm hàm xác thực token hợp lệ ở đây để lấy user_id...)


      // =========================================================================
      // 🔴 VÙNG 3: CÁC API INSERT / UPDATE / DELETE (CẦN ĐĂNG NHẬP)
      // =========================================================================

      // 3. API Tạo sách mới (Chỉ chạy được khi đã vượt qua Vùng 2 ở trên)
      if (url.pathname === '/api/books' && request.method === 'POST') {
        const body = await request.json();
        const { title, slug, summary } = body;

        const info = await env.DB.prepare(`
          INSERT INTO books (title, slug, summary) VALUES (?, ?, ?)
        `).bind(title, slug, summary || '').run();

        return new Response(JSON.stringify({ success: true, id: info.meta.last_row_id }), { headers });
      }

      return new Response(JSON.stringify({ success: false, message: 'API Route Not Found' }), { status: 404, headers });

    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers });
    }
  }
};
