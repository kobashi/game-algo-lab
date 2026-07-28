/** @see docs/topics/gfx-gpu-concepts/SPEC.md */
export const GFX_GPU_CONCEPTS_CONFIG = {
  stages: [
    { id: "cpu", label: "CPU / アプリ", blurb: "頂点データ・行列・描画命令を用意" },
    { id: "vs", label: "頂点シェーダ", blurb: "モデル→クリップ空間へ変換" },
    { id: "raster", label: "ラスタライザ", blurb: "三角形をピクセル候補に分割" },
    { id: "fs", label: "ピクセルシェーダ", blurb: "色・テクスチャ・照明" },
    { id: "rop", label: "出力結合", blurb: "深度・ブレンドしてフレームバッファへ" },
    { id: "display", label: "ディスプレイ", blurb: "完成した画像を表示" },
  ],
};
