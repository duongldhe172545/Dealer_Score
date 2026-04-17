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
      'Anh/chị có lưu danh sách khách cũ theo tên, số điện thoại hay mã công trình không?',
      'Trong 3 tháng gần nhất, có bao nhiêu khách quay lại hoặc tiếp tục giới thiệu khách mới?',
      'Khách mới thường đến từ nguồn nào: referral, đi ngang cửa hàng, Facebook, thợ quen hay nguồn khác?',
      'Khi cần chăm sóc lại khách cũ, anh/chị có thể trích xuất danh sách trong bao lâu?',
      'Anh/chị có phân biệt được nhóm khách lẻ, khách công trình và khách đối tác không?'
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
      'Anh/chị hiện tính lợi nhuận cho từng đơn hoặc từng công trình như thế nào?',
      'Bao lâu thì thu hồi xong công nợ từ khách sau khi bàn giao?',
      'Anh/chị có theo dõi riêng doanh thu, giá vốn, chi phí thợ và chi phí vận hành không?',
      'Nếu nhà cung cấp dừng ký gửi, cửa hàng có tự xoay được vốn lưu động không?',
      'Trong tháng gần nhất, có đơn nào bị âm lợi nhuận mà anh/chị không xác định được nguyên nhân không?'
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
      'Đội thi công hiện có bao nhiêu người làm thường xuyên với cửa hàng?',
      'Thợ đã gắn bó liên tục bao lâu và có phụ thuộc vào thời vụ không?',
      'Khi có 2-3 job cùng lúc, ai là người điều phối lịch và giao việc?',
      'Anh/chị có tiêu chuẩn tay nghề hoặc checklist bàn giao cho đội không?',
      'Nếu có lỗi sau lắp đặt, đội có quay lại xử lý theo SLA rõ ràng không?'
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
      'Khi khách khiếu nại, ai là người đứng ra xử lý đầu tiên?',
      'Chi phí bảo hành hoặc sửa lỗi thường do ai quyết định chi trả?',
      'Anh/chị có ký cam kết bảo hành dưới tên cửa hàng không?',
      'Nếu lỗi phát sinh do lắp đặt, anh/chị giải quyết như thế nào với khách và với đội thi công?',
      'Đã từng có trường hợp phải bù chi phí để giữ uy tín chưa?'
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
      'Vì sao anh/chị muốn tham gia ADG hoặc chương trình phát triển dealer lúc này?',
      'Hiện tại nút thắt lớn nhất là khách hàng, tài chính, đội thi công hay vận hành?',
      'Nếu được hỗ trợ một việc trong 30 ngày tới, anh/chị muốn ưu tiên điều gì nhất?',
      'Anh/chị có sẵn sàng thay đổi quy trình bán hàng/ghi chép/điều phối nếu hiệu quả hơn không?',
      'Thành công sau 3 tháng với anh/chị sẽ được đo bằng chỉ số nào?'
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
