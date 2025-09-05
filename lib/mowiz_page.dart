import 'package:flutter/material.dart';
import 'language_selector.dart';
import 'theme_mode_button.dart';
import 'l10n/app_localizations.dart';
import 'mowiz_pay_page.dart';
import 'mowiz_cancel_page.dart';
import 'home_page.dart';
import 'mowiz/mowiz_scaffold.dart';
import 'styles/mowiz_buttons.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'sound_helper.dart';

class MowizPage extends StatelessWidget {
  const MowizPage({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).t;
    return MowizScaffold(
      title: 'MeyPark',
      actions: const [
        LanguageSelector(),
        SizedBox(width: 8),
        ThemeModeButton(),
      ],
      body: SafeArea(
        // 🟢 SafeArea para evitar solapamientos inferiores y superiores
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final height = constraints.maxHeight;

            // 🔵 Definimos un ancho máximo profesional para contenido
            const double maxContentWidth = 500;
            final double contentWidth = width > maxContentWidth ? maxContentWidth : width;
            final EdgeInsets padding = EdgeInsets.symmetric(horizontal: contentWidth * 0.05);

            final bool isWide = contentWidth >= 700;
            final double gap = isWide ? 32 : 24;
            final double fontSize = isWide ? 28 : 22;
            final double buttonHeight = isWide ? 100 : 60;

            final ButtonStyle baseStyle = kMowizFilledButtonStyle.copyWith(
              minimumSize: MaterialStatePropertyAll(Size(double.infinity, buttonHeight)),
              padding: MaterialStatePropertyAll(EdgeInsets.symmetric(vertical: 0)),
              shape: const MaterialStatePropertyAll(
                RoundedRectangleBorder(
                  borderRadius: BorderRadius.all(Radius.circular(30)),
                ),
              ),
              textStyle: MaterialStatePropertyAll(
                TextStyle(fontSize: fontSize),
              ),
            );

            final payBtn = FilledButton(
              onPressed: () {
                SoundHelper.playTap();
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const MowizPayPage(),
                  ),
                );
              },
              style: baseStyle,
              child: AutoSizeText(
                t('payTicket'),
                maxLines: 1,
                minFontSize: 14,
              ),
            );

            final cancelBtn = FilledButton(
              onPressed: () {
                SoundHelper.playTap();
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const MowizCancelPage(),
                  ),
                );
              },
              style: baseStyle.copyWith(
                backgroundColor: MaterialStatePropertyAll(
                  Theme.of(context).colorScheme.secondary,
                ),
                foregroundColor: MaterialStatePropertyAll(
                  Theme.of(context).colorScheme.onSecondary,
                ),
              ),
              child: AutoSizeText(
                t('cancelDenuncia'),
                maxLines: 1,
                minFontSize: 14,
              ),
            );

            // 🟣 Botón home (inferior)
            final homeBtn = Padding(
              padding: const EdgeInsets.only(top: 28, bottom: 16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: 320,
                  ),
                  child: SizedBox(
                    width: contentWidth * 0.6,
                    height: 46,
                    child: TextButton(
                      onPressed: () {
                        SoundHelper.playTap();
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const HomePage()),
                          (route) => false,
                        );
                      },
                      style: TextButton.styleFrom(
                        minimumSize: const Size.fromHeight(40),
                        textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                      ),
                      child: Text(t('home')),
                    ),
                  ),
                ),
              ),
            );

            Widget mainButtons = isWide
                ? Row(
                    children: [
                      Expanded(child: payBtn),
                      SizedBox(width: gap),
                      Expanded(child: cancelBtn),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      payBtn,
                      SizedBox(height: gap),
                      cancelBtn,
                    ],
                  );

            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: maxContentWidth,
                  minWidth: 260,
                  minHeight: height,
                ),
                child: Padding(
                  padding: padding,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Expanded(child: mainButtons),
                      homeBtn,
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
