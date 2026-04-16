/**
 * 9 Tiêu chí chấm điểm đại lý
 * Extracted from "Tiêu chí phân loại Dealer.xlsx"
 */
window.CRITERIA = [
  {
    code: 'C1',
    name: 'Sở hữu khách hàng bền vững',
    group: 1,
    groupName: 'Năng lực hiện tại',
    weight: 0.20,
    questions: [
      'Anh có list khách cũ không?',
      'Khách mới từ đâu đến?'
    ],
    rubric: {
      0: 'Không nhớ tên khách cũ / không có danh sách',
      1: 'Nhớ khách theo quan hệ cá nhân (thợ/chủ), chưa có list hệ thống',
      2: 'Có list ≥50 House_ID, tỷ lệ quay lại ≥30%/năm hoặc có referral rõ'
    }
  },
  {
    code: 'C2',
    name: 'P&L độc lập + dòng tiền tự quản',
    group: 1,
    groupName: 'Năng lực hiện tại',
    weight: 0.15,
    questions: [
      'Anh tính lãi thế nào?',
      'Trung bình bao lâu thu hồi công nợ?'
    ],
    rubric: {
      0: 'Không biết lãi/lỗ từng job / phụ thuộc hoàn toàn vào ký gửi',
      1: 'Biết biên lợi nhuận nhưng DSO >60 ngày / hay bị nợ đọng',
      2: 'Biên LN >15%, DSO ≤60 ngày, tự chủ dòng tiền, không phụ thuộc ký gửi'
    }
  },
  {
    code: 'C3',
    name: 'Quản lý đội thi công cơ hữu',
    group: 1,
    groupName: 'Năng lực hiện tại',
    weight: 0.15,
    questions: [
      'Đội anh có mấy người cố định?',
      'Thợ có đi theo anh lâu không?'
    ],
    rubric: {
      0: 'Không có đội, tự làm hoặc gọi thợ tự do theo vụ',
      1: 'Có 1-3 thợ nhưng không cố định, gọi theo nhu cầu',
      2: 'Có ≥2 thợ cơ hữu gắn bó >6 tháng, điều phối được lịch job, SLA ổn'
    }
  },
  {
    code: 'C4',
    name: 'Trách nhiệm cuối (skin-in-the-game)',
    group: 1,
    groupName: 'Năng lực hiện tại',
    weight: 0.15,
    questions: [
      'Khi khách khiếu nại, anh xử lý thế nào?',
      'Ai chịu chi phí bảo hành?'
    ],
    rubric: {
      0: 'Đổ lỗi cho nhà SX khi có sự cố / không dám ký bảo hành',
      1: 'Xử lý bảo hành nhưng đòi hoàn chi phí từ nhà SX',
      2: 'Ký bảo hành bằng danh nghĩa cửa hàng, chịu chi phí sửa trực tiếp'
    }
  },
  {
    code: 'C5',
    name: 'Động lực tham gia có nguồn gốc rõ',
    group: 1,
    groupName: 'Năng lực hiện tại',
    weight: 0.10,
    questions: [
      'Tại sao anh muốn tham gia ADG?',
      'Điều gì khiến anh khó khăn nhất hiện nay?'
    ],
    rubric: {
      0: 'Không muốn thay đổi cách làm hiện tại / tham gia cho có',
      1: 'Quan tâm nhưng chưa chỉ ra được lợi ích cụ thể / còn mơ hồ',
      2: 'Chỉ rõ 1 nỗi đau muốn giải ngay: DSO, thiếu thợ, thiếu khách mới...'
    }
  },
  {
    code: 'C6',
    name: 'Kiểm soát địa bàn vật lý',
    group: 2,
    groupName: 'Nền tảng bền vững',
    weight: 0.10,
    questions: [
      'Khách trong phường có biết đến anh không?',
      'Khách mới thường tìm anh bằng cách nào?'
    ],
    rubric: {
      0: 'Không có vùng địa lý nhất định / khách đến ngẫu nhiên',
      1: 'Có quan hệ ở 1 khu vực nhưng không độc quyền, vẫn phải chạy quảng cáo',
      2: 'Khách <5km gọi họ đầu tiên không cần quảng cáo / được biết đến như "ông trùm khu vực"'
    }
  },
  {
    code: 'C7',
    name: 'Kỷ luật dữ liệu (tạo evidence)',
    group: 2,
    groupName: 'Nền tảng bền vững',
    weight: 0.08,
    questions: [
      'Anh lưu thông tin job thế nào?',
      'Có thể xem lại lịch sử khách cũ không?'
    ],
    rubric: {
      0: 'Không ghi chép gì, mọi thứ nằm trong đầu / Zalo cá nhân lộn xộn',
      1: 'Ghi chép rải rác Zalo/Excel nhưng chưa chuẩn hóa, khó truy xuất',
      2: 'Có hệ thống ghi chép job/tiền rõ ràng, xuất được lịch sử khách khi cần'
    }
  },
  {
    code: 'C8',
    name: 'Kiểm soát chuỗi cung ứng ngược (S_ID)',
    group: 2,
    groupName: 'Nền tảng bền vững',
    weight: 0.04,
    questions: [
      'Anh nhập hàng từ mấy nguồn?',
      'Có thể đổi nhà cung cấp nếu cần không?'
    ],
    rubric: {
      0: 'Mua theo chỉ định nhà SX, không có quyền chọn nguồn',
      1: 'Có 2-3 nguồn cung cấp để lựa chọn nhưng chưa dám đàm phán sâu',
      2: 'Chủ động đặt hàng, thương lượng được giá/điều khoản thanh toán'
    }
  },
  {
    code: 'C9',
    name: 'Sức ảnh hưởng cộng đồng (network multiplier)',
    group: 2,
    groupName: 'Nền tảng bền vững',
    weight: 0.03,
    questions: [
      'Có ai giới thiệu khách/thợ cho anh không?',
      'Anh có giới thiệu ai vào nghề không?'
    ],
    rubric: {
      0: 'Không ai trong nghề biết đến / hoạt động đơn lẻ',
      1: 'Được vài người trong nghề biết và tin tưởng',
      2: 'Người khác chủ động giới thiệu thợ/khách cho họ / có thể kéo người mới vào hệ thống'
    }
  }
];
