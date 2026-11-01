package mcplib

// Nhóm hiển thị – thứ tự nhóm = thứ tự mục đầu tiên của nhóm trong library.
const (
	groupFile   = "Tệp & tài liệu"
	groupWeb    = "Web & tìm kiếm"
	groupWork   = "Dữ liệu & công việc"
	groupAI     = "AI & tiện ích"
	groupSystem = "Thanh toán & hệ thống"
)

// library – chọn tay (người dùng chốt 2026-10-28 / 2026-11-01), tên gói đã kiểm trên trang chính chủ / npm / PyPI.
// Không đưa Playwright MCP / chrome-devtools-mcp: trùng node web của app (55 M6).
var library = []Entry{
	{ID: "filesystem", Group: groupFile, Name: "Filesystem", Desc: "Đọc / ghi / tìm file trong thư mục bạn cho phép (server mẫu chính thức).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@modelcontextprotocol/server-filesystem", "${dir}"}, Needs: "npx",
		Params: []Param{{Key: "dir", Label: "Thư mục được phép", Placeholder: "/Users/ban/Documents"}},
		Warn:   "Tool ghi / xoá file chỉ trong thư mục đã chọn; app hỏi trước mỗi lần."},
	{ID: "markitdown", Group: groupFile, Name: "MarkItDown", Desc: "PDF / docx / pptx / xlsx → Markdown (Microsoft).", Kind: "stdio",
		Command: "uvx", Args: []string{"markitdown-mcp"}, Needs: "uvx", Warn: "Đọc file bạn chỉ đường dẫn."},
	{ID: "git", Group: groupFile, Name: "Git", Desc: "Xem trạng thái, lịch sử, diff, commit một repo git trên máy (server mẫu chính thức).", Kind: "stdio",
		Command: "uvx", Args: []string{"mcp-server-git", "--repository", "${repo}"}, Needs: "uvx",
		Params: []Param{{Key: "repo", Label: "Thư mục repo", Placeholder: "/Users/ban/code/du-an"}},
		Warn:   "Tool commit / đổi nhánh sửa repo; app hỏi trước."},

	{ID: "fetch", Group: groupWeb, Name: "Fetch", Desc: "Tải trang web về dạng chữ / Markdown (server mẫu chính thức).", Kind: "stdio",
		Command: "uvx", Args: []string{"mcp-server-fetch"}, Needs: "uvx", Warn: "Truy cập internet từ máy bạn."},
	{ID: "exa", Group: groupWeb, Name: "Exa", Desc: "Tìm kiếm web cho AI, lấy nội dung trang (từ xa, không cần key – giới hạn lượt).", Kind: "http",
		URL: "https://mcp.exa.ai/mcp", Warn: "Câu tìm gửi tới máy chủ Exa."},
	{ID: "brave-search", Group: groupWeb, Name: "Brave Search", Desc: "Tìm web / tin tức / ảnh / địa điểm qua Brave (gói chính chủ; key miễn phí 2.000 lượt / tháng).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@brave/brave-search-mcp-server"}, Needs: "npx",
		Env: map[string]string{"BRAVE_API_KEY": "{{secret.brave_api_key}}"}, Secrets: []string{"brave_api_key"}},
	{ID: "tavily", Group: groupWeb, Name: "Tavily", Desc: "Tìm kiếm + trích nội dung trang cho AI (gói chính chủ, có gói miễn phí).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "tavily-mcp@latest"}, Needs: "npx",
		Env: map[string]string{"TAVILY_API_KEY": "{{secret.tavily_api_key}}"}, Secrets: []string{"tavily_api_key"}},
	{ID: "firecrawl", Group: groupWeb, Name: "Firecrawl", Desc: "Cào trang / cả website thành Markdown, trích dữ liệu có cấu trúc (gói chính chủ).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "firecrawl-mcp"}, Needs: "npx",
		Env: map[string]string{"FIRECRAWL_API_KEY": "{{secret.firecrawl_api_key}}"}, Secrets: []string{"firecrawl_api_key"},
		Warn: "Mỗi lần cào tính vào hạn mức tài khoản Firecrawl."},

	{ID: "github", Group: groupWork, Name: "GitHub", Desc: "Repo, issue, pull request qua server GitHub chính thức (từ xa).", Kind: "http",
		URL: "https://api.githubcopilot.com/mcp/", Headers: map[string]string{"Authorization": "Bearer {{secret.github_token}}"},
		Secrets: []string{"github_token"}, Warn: "Dùng token GitHub của bạn; tool ghi (tạo issue, PR…) app hỏi trước."},
	{ID: "notion", Group: groupWork, Name: "Notion", Desc: "Đọc / tạo trang, ghi dòng vào database Notion (gói chính chủ, token integration).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@notionhq/notion-mcp-server"}, Needs: "npx",
		Env: map[string]string{"NOTION_TOKEN": "{{secret.notion_token}}"}, Secrets: []string{"notion_token"},
		Warn: "Chỉ thấy trang đã chia sẻ cho integration; tool ghi app hỏi trước."},
	{ID: "airtable", Group: groupWork, Name: "Airtable", Desc: "Đọc / ghi bản ghi trong base Airtable (token cá nhân).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "airtable-mcp-server"}, Needs: "npx", ThirdParty: true,
		Env: map[string]string{"AIRTABLE_API_KEY": "{{secret.airtable_token}}"}, Secrets: []string{"airtable_token"},
		Warn: "Token có quyền ghi thì tool sửa / xoá bản ghi – app hỏi trước."},

	{ID: "memory", Group: groupAI, Name: "Memory", Desc: "Bộ nhớ dạng đồ thị tri thức, giữ giữa các lần chạy (server mẫu chính thức).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@modelcontextprotocol/server-memory"}, Needs: "npx"},
	{ID: "time", Group: groupAI, Name: "Time", Desc: "Giờ hiện tại và đổi múi giờ (server mẫu chính thức).", Kind: "stdio",
		Command: "uvx", Args: []string{"mcp-server-time"}, Needs: "uvx"},
	{ID: "sequential-thinking", Group: groupAI, Name: "Sequential Thinking", Desc: "Cho AI suy nghĩ từng bước có ghi lại (server mẫu chính thức).", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@modelcontextprotocol/server-sequential-thinking"}, Needs: "npx"},
	{ID: "huggingface", Group: groupAI, Name: "Hugging Face", Desc: "Tìm model / dataset / Space, gọi Space làm ảnh, đọc tài liệu (server chính thức, từ xa).", Kind: "http",
		URL: "https://huggingface.co/mcp", Headers: map[string]string{"Authorization": "Bearer {{secret.hf_token}}"},
		Secrets: []string{"hf_token"}, Warn: "Token đọc (READ) là đủ."},
	{ID: "context7", Group: groupAI, Name: "Context7", Desc: "Tài liệu mới nhất của thư viện lập trình cho AI (từ xa, không cần key – giới hạn lượt).", Kind: "http",
		URL: "https://mcp.context7.com/mcp"},

	{ID: "stripe", Group: groupSystem, Name: "Stripe", Desc: "Khách hàng, hoá đơn, link thanh toán, hoàn tiền Stripe (server chính thức, từ xa).", Kind: "http",
		URL: "https://mcp.stripe.com", Headers: map[string]string{"Authorization": "Bearer {{secret.stripe_key}}"}, Secrets: []string{"stripe_key"},
		Warn: "Thao tác tiền thật – dùng restricted key (rk_…) chỉ cấp quyền cần, thử ở chế độ test trước."},
	{ID: "desktop-commander", Group: groupSystem, Name: "Desktop Commander", Desc: "Chạy lệnh terminal, quản lý tiến trình, sửa file bất kỳ trên máy.", Kind: "stdio",
		Command: "npx", Args: []string{"-y", "@wonderwhy-er/desktop-commander"}, Needs: "npx", ThirdParty: true,
		Warn: "Quyền rất mạnh: chạy được mọi lệnh trên máy bạn. Chỉ thêm khi thật cần."},
}
