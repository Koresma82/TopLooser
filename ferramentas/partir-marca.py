# Parte a imagem da marca nas peças que a app usa.
from PIL import Image, ImageDraw
import numpy as np
import os

ORIG = '/root/.claude/uploads/f3f37598-0b0a-5562-894b-970b84529baa/b059c45b-image.png'
DEST = '/home/claude/toplooser/public/marca'
os.makedirs(DEST, exist_ok=True)

original = Image.open(ORIG).convert('RGB')


def guardar(img, nome, lado=None, quadrado=False):
    if lado:
        if quadrado:
            img = img.resize((lado, lado), Image.LANCZOS)
        else:
            escala = lado / max(img.size)
            img = img.resize(
                (max(1, round(img.width * escala)), max(1, round(img.height * escala))),
                Image.LANCZOS
            )
    caminho = os.path.join(DEST, nome)
    img.save(caminho, optimize=True)
    print(f'{nome:26} {img.size[0]}x{img.size[1]}  {os.path.getsize(caminho)/1024:.1f} KB')
    return img


def cantos_redondos(img, raio_relativo=0.225):
    """Os mosaicos originais têm cantos redondos e, à volta deles, o fundo claro
    da folha. Sem isto o ícone aparecia com quatro cantos brancos."""
    img = img.convert('RGBA')
    lado = min(img.size)
    mascara = Image.new('L', img.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1],
        radius=int(lado * raio_relativo),
        fill=255
    )
    img.putalpha(mascara)
    return img


def recortar_com_alfa(caixa, limiar=70, amostra=None, cantos=True):
    """Recorta uma peça e torna o fundo do mosaico transparente, mantendo as
    cores do desenho.

    A cor do fundo é lida no TOPO AO CENTRO do mosaico. Lida num canto apanhava
    o canto redondo — onde se vê o fundo claro da folha — e a transparência
    saía ao contrário: o desenho desaparecia e o fundo ficava opaco."""
    peca = original.crop(caixa)
    a = np.array(peca).astype(np.int16)

    ax, ay = amostra if amostra else (peca.width // 2 - 5, 6)
    fundo = np.median(a[ay:ay + 10, ax:ax + 10].reshape(-1, 3), axis=0)

    distancia = np.sqrt(((a - fundo) ** 2).sum(axis=2))
    alfa = np.clip((distancia / limiar) * 255, 0, 255).astype(np.uint8)

    # Nos cantos redondos do mosaico vê-se o fundo claro da folha, que ficaria
    # opaco. Apaga-se pela forma e não pela cor: apagar "o que é claro" levava
    # também o branco dos desenhos, que é a parte que interessa.
    if cantos:
        mascara = Image.new('L', peca.size, 0)
        ImageDraw.Draw(mascara).rounded_rectangle(
            [0, 0, peca.width - 1, peca.height - 1],
            radius=int(min(peca.size) * 0.24),
            fill=255
        )
        alfa = np.minimum(alfa, np.array(mascara))

    img = Image.fromarray(np.dstack([np.array(peca), alfa]), 'RGBA')
    bb = img.getbbox()
    return img.crop(bb) if bb else img


print('— ícones da aplicação —')
# Ícone principal, com o nome por baixo: é este que vai para o telemóvel.
icone = cantos_redondos(original.crop((42, 99, 714, 779)))
guardar(icone, 'icone-app-512.png', 512, quadrado=True)
guardar(icone, 'icone-app-192.png', 192, quadrado=True)
guardar(icone, 'icone-app-180.png', 180, quadrado=True)

# Versão compacta, sem o nome: legível em tamanho pequeno.
favicon = cantos_redondos(original.crop((845, 171, 1114, 439)))
guardar(favicon, 'favicon-64.png', 64, quadrado=True)
guardar(favicon, 'favicon-32.png', 32, quadrado=True)

print('\n— logótipo —')
# O nome escrito dentro do ícone: branco e verde, para fundo escuro.
# (a versão da direita da folha é azul-escura, ilegível no tema da app)
logo = recortar_com_alfa((100, 592, 672, 706), limiar=90, amostra=(4, 4), cantos=False)
guardar(logo, 'logotipo.png', 560)

print('\n— ícones temáticos —')
mosaicos = {
    'desafios': (46, 902, 238, 1085),
    'tops': (262, 902, 440, 1085),
    'imc': (464, 902, 643, 1085),
    'datas': (667, 902, 840, 1085),
    'comunidade': (865, 902, 1038, 1085),
    'motivacao': (1061, 902, 1218, 1085)
}
for nome, caixa in mosaicos.items():
    guardar(recortar_com_alfa(caixa, limiar=80), f'icone-{nome}.png', 112)
