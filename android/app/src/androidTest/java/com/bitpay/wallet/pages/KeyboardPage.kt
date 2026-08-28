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
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.hasSibling
import androidx.test.espresso.matcher.ViewMatchers.withParent
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
            // Key labels are nested under per-key containers; sibling checks must
            // be applied at the parent level, not directly between text views.
            val key: Matcher<View> = when (char) {
                '0' -> allOf(
                    withText("0"),
                    withParent(hasSibling(hasDescendant(withText("."))))
                )
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
        // The digit labels are not direct siblings; constrain via each label's
        // parent being adjacent to the expected neighbor key container.
        val sixKey = allOf(
            withText("6"),
            withParent(hasSibling(hasDescendant(withText("5"))))
        )
        val nineKey = allOf(
            withText("9"),
            withParent(hasSibling(hasDescendant(withText("8"))))
        )

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