const DEFAULT_DATA = {
  bio: {
    name: "Rivaldy Kava Pratama",
    school: "SMK SMTI Pontianak",
    location: "Pontianak, Kalbar",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    summary: "Siswa aktif SMK SMTI Pontianak jurusan Teknik Otomasi Industri. Memiliki minat mendalam pada sistem kontrol otomatisasi, kendali PLC, kelistrikan industri, dan integrasi IoT industri.",
    story1: "Sejak awal masuk ke SMK SMTI Pontianak, saya memiliki ketertarikan yang sangat tinggi terhadap dunia teknologi dan perakitan sistem otomatis. Jurusan Teknik Otomasi Industri (TOI) memberikan wadah yang tepat bagi saya untuk mempelajari gabungan dari teknik kelistrikan, mekanik, elektronika, hingga pemograman komputer.",
    story2: "Selama di SMK SMTI Pontianak, saya aktif mengikuti praktikum pemrograman PLC, perancangan diagram ladder, serta pengawatan panel kontrol. Mengikuti berbagai simulasi proyek industri dan kompetisi keterampilan siswa melatih ketelitian, pemecahan masalah (troubleshooting), serta kerja sama tim dalam menyelesaikan tantangan teknik yang kompleks.",
    story3: "Cita-cita saya adalah menjadi seorang Engineer Otomasi yang andal, dapat berkontribusi dalam modernisasi industri manufaktur berbasis Smart Factory dan IoT di Indonesia, serta membawa harum nama sekolah dan daerah asal saya, Pontianak."
  },
  pageTexts: {
    profileTitle: "Profil Lengkap & Cerita Saya",
    schoolHeadingTitle: "SMK SMTI Pontianak",
    schoolHeadingSub: "Sekolah Menengah Kejuruan Industri - Kementerian Perindustrian RI",
    schoolIntroText: "SMK SMTI Pontianak merupakan sekolah vokasi industri unggulan yang mencetak lulusan kompeten di bidang manufaktur dan teknologi modern. Berikut adalah foto-foto kegiatan dan lingkungan sekolah saya beserta deskripsi penjelasan di bawah setiap foto.",
    achievementsHeadingTitle: "Prestasi & Sertifikasi",
    achievementsHeadingSub: "Daftar pencapaian perlombaan, penghargaan, serta sertifikasi kompetensi selama sekolah.",
    galleryHeadingTitle: "Galeri Karya & Kegiatan",
    galleryHeadingSub: "Dokumentasi foto perakitan alat, praktikum bengkel TOI, serta momen sekolah."
  },
  swStories: [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=800",
      caption: "Praktikum Perakitan Diagram Ladder PLC & Sensor Proximity di Lab Otomasi SMTI!",
      timestamp: Date.now() - (2 * 3600 * 1000)
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
      caption: "Pemasangan Wiring Panel Listrik 3 Fasa & Solenoid Valve Pneumatik.",
      timestamp: Date.now() - (5 * 3600 * 1000)
    }
  ],
  schoolPhotos: [
    {
      id: 1,
      title: "Gedung Utama & Gedung Workshop SMTI Pontianak",
      image: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=800",
      description: "Gedung utama SMK SMTI Pontianak dilengkapi dengan fasilitas modern, laboratorium komputer, serta lingkungan belajar yang nyaman berstandar industri nasional."
    },
    {
      id: 2,
      title: "Laboratorium Bengkel Otomasi Industri (TOI)",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
      description: "Fasilitas praktikum utama jurusan TOI yang dilengkapi Trainer PLC Omron & Siemens, Modul Elektropneumatik Festo, serta Bench Test Kelistrikan Industri."
    }
  ],
  achievements: [
    {
      id: 1,
      title: "Juara Utama LKS SMK Otomasi Industri",
      badge: "Tingkat Provinsi / 2025",
      image: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&q=80&w=800",
      description: "Berhasil meraih juara pada kompetisi Perakitan & Pemrograman Sistem Kontrol PLC & Pneumatik."
    },
    {
      id: 2,
      title: "Sertifikasi Kompetensi BNSP Teknik Otomasi",
      badge: "Sertifikasi / 2025",
      image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=800",
      description: "Lulus uji kompetensi kualifikasi pemeliharaan sistem otomasi & kontrol kelistrikan."
    }
  ],
  gallery: [
    {
      id: 1,
      title: "Pengawatan Panel Listrik Kontrol",
      image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&q=80&w=800",
      description: "Proses perakitan dan rapih wiring panel kontrol menggunakan relay dan kontaktor."
    },
    {
      id: 2,
      title: "Pengujian Sistem Pneumatik",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
      description: "Simulasi gerakan silinder pneumatik dengan kendali katup solenoid & PLC."
    }
  ]
};
