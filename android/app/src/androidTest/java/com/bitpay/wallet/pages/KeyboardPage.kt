package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.CoordinatesProvider
import androidx.test.espresso.action.GeneralClickAction
import androidx.test.espresso.action.Press
import androidx.test.espresso.action.Tap
import androidx.test.espresso.matcher.ViewMatchers.hasSibling
import androidx.test.espresso.matcher.ViewMatchers.withText
import android.view.View
import org.hamcrest.Matcher
import org.hamcrest.Matchers.allOf

class KeyboardPage {

    // ---- Locators ----

    private val continueButton = withText("Continue")


    // ---- Actions ----
    fun enterAmount(amount: String = "0") {
        for (char in amount) {
            // Use a positive sibling check to uniquely identify keyboard keys.
            // "0" shares the bottom row with ".", so hasSibling(withText("."))
            // distinguishes the keyboard "0" from any amount-display "0".
            // Other digits are unambiguous (the display shows the full amount
            // string in one text view, so withText("3") won't match "30").
            val key: Matcher<View> = when (char) {
                '0' -> allOf(withText("0"), hasSibling(withText(".")))
                else -> withText(char.toString())
            }
            WaitUtils.waitForView(key)
            Thread.sleep(200)
            onView(key).perform(click())
        }
    }

    fun clickContinue() {
        WaitUtils.waitForViewEnabled(continueButton)
        onView(continueButton).perform(click())
    }


    /**
     * Backspace key does not expose a unique accessibility identifier.
     * Calculate its position dynamically using the relative spacing
     * between the keypad keys "6" and "9".
     */
    fun clickBackspace(count: Int = 1) {
        // Use adjacent-key sibling checks so these matchers target keyboard keys
        // only — if the displayed amount contains "6" or "9", withText alone would
        // be ambiguous and waitForView would time out after 30 s.
        val sixKey = allOf(withText("6"), hasSibling(withText("5")))
        val nineKey = allOf(withText("9"), hasSibling(withText("8")))

        WaitUtils.waitForView(sixKey)
        WaitUtils.waitForView(nineKey)

        var sixView: View? = null
        var nineView: View? = null

        onView(sixKey).perform(object : androidx.test.espresso.ViewAction {
            override fun getConstraints() = org.hamcrest.Matchers.any(View::class.java)
            override fun getDescription() = "capture six key view"
            override fun perform(uiController: androidx.test.espresso.UiController, view: View) {
                sixView = view
            }
        })

        onView(nineKey).perform(object : androidx.test.espresso.ViewAction {
            override fun getConstraints() = org.hamcrest.Matchers.any(View::class.java)
            override fun getDescription() = "capture nine key view"
            override fun perform(uiController: androidx.test.espresso.UiController, view: View) {
                nineView = view
            }
        })

        val sixLocation = IntArray(2)
        val nineLocation = IntArray(2)
        sixView!!.getLocationOnScreen(sixLocation)
        nineView!!.getLocationOnScreen(nineLocation)

        val sixMidY = sixLocation[1] + (sixView!!.height / 2)
        val nineMidY = nineLocation[1] + (nineView!!.height / 2)
        val nineMidX = nineLocation[0] + (nineView!!.width / 2)

        val rowHeight = Math.abs(nineMidY - sixMidY)

        val backspaceX = nineMidX.toFloat()
        val backspaceY = (nineMidY + rowHeight).toFloat()

        val backspaceCoordinatesProvider = CoordinatesProvider { _ ->
            floatArrayOf(backspaceX, backspaceY)
        }

        repeat(count) {
            onView(nineKey).perform(
                GeneralClickAction(
                    Tap.SINGLE,
                    backspaceCoordinatesProvider,
                    Press.FINGER,
                    android.view.InputDevice.SOURCE_UNKNOWN,
                    android.view.MotionEvent.BUTTON_PRIMARY
                )
            )
        }
    }


}